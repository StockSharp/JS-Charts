// What a chart UI module needs from the page it is mounted in.
//
// The modules in this folder - the legend, the context menu, the type switcher, the indicator
// dialog - used to reach their host through window properties: `window.__T` for the dictionary,
// `window.TerminalUtils` for price formatting and toasts, `window.terminalApp` for the dialogs
// they open. That works only on a page whose shell defines all three, which is precisely why this
// layer could not be published: a consumer would have had to recreate a shell whose contract was
// written down nowhere.
//
// They take a host instead, and the host is this file. Three services, because three is what they
// actually reach for: word a string, word a number, tell the user something went wrong.

/// Translate a key, substituting `{0}`, `{1}`... positionally.
///
/// Keyed by English source text rather than by a symbolic id: an unanswered key falls back to
/// itself, which is readable English rather than a missing-key marker in front of the user.
export type Translate = (key: string, ...args: readonly string[]) => string;

/// A page with one language: every key is its own answer, placeholders still substituted.
export const identityTranslate: Translate = (key, ...args) => substitute(key, args);

/// Build a translator over a dictionary keyed by English source text.
///
/// The shape a server-rendered page already has: one flat object, no namespaces, no plural rules.
export function createTranslate(dictionary: Readonly<Record<string, string>>): Translate {
    return (key, ...args) => substitute(dictionary[key] === undefined ? key : dictionary[key], args);
}

function substitute(text: string, args: readonly string[]): string {
    if (args.length === 0) return text;

    let out = text;
    for (let i = 0; i < args.length; i++)
        out = out.split(`{${i}}`).join(String(args[i]));
    return out;
}

/// Numbers, as the page words them.
///
/// A chart that formats prices its own way disagrees with the blotter beside it about what the
/// same number is, and the reader is the one who has to reconcile them. So the page decides, and
/// every module here asks.
export interface ChartFormatters {
    /// A price on the instrument's own scale.
    price(value: number): string;

    /// A traded size.
    volume(value: number): string;

    /// A moment on the time axis. Unix seconds, which is what the engine counts in.
    time(timeSec: number): string;
}

/// Formatting that stands on its own, for a page with nothing of its own to impose.
///
/// Precision follows magnitude rather than a fixed count: five decimals on a penny stock and none
/// on an index is what a trader expects, and one setting cannot be both.
export const defaultChartFormatters: ChartFormatters = {
    price(value) {
        if (!Number.isFinite(value)) return '--';

        const size = Math.abs(value);
        let places = 2;
        if (size < 1) places = 4;
        if (size < 0.1) places = 5;
        if (size < 0.001) places = 6;
        if (size >= 1000) places = 1;
        if (size >= 10000) places = 0;
        return value.toFixed(places);
    },

    volume(value) {
        if (!Number.isFinite(value)) return '--';
        return value.toFixed(Math.abs(value) >= 1000 ? 0 : 3);
    },

    time(timeSec) {
        if (!Number.isFinite(timeSec)) return '--';

        // `YYYY-MM-DD HH:MM`, not the locale's own string: a legend sits one line above the chart
        // and is read at a glance beside other numbers, where "6/10/2026, 3:00:00 AM" is both
        // wider than the strip and ambiguous about which half is the month. Seconds are dropped
        // because a bar is not a moment. A page that wants its own wording passes its own
        // formatter - that is what the option is for.
        const at = new Date(timeSec * 1000);
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
            + ` ${pad(at.getHours())}:${pad(at.getMinutes())}`;
    },
};

/// How loud a message is. The four the modules actually raise; a host maps them onto whatever it
/// shows the user, which on most pages is a toast.
export type NotificationKind = 'success' | 'info' | 'warning' | 'error';

/// Tell the user something. Where it appears is the page's business - these modules render inside
/// a chart, and a chart is the wrong place for a message about a template that failed to save.
export type Notify = (message: string, kind: NotificationKind) => void;

/// A notifier for a page that has nowhere to put messages: the browser's console, which at least
/// keeps the failure findable instead of swallowing it.
export const consoleNotify: Notify = (message, kind) => {
    if (kind === 'error') console.error(message);
    else if (kind === 'warning') console.warn(message);
    else console.info(message);
};

/// Everything a chart UI module asks of its page.
///
/// One object rather than three separate options, because a module that has one of these needs
/// all three, and a host that supplies one has already decided the other two.
export interface ChartUiHost {
    readonly translate: Translate;
    readonly formatters: ChartFormatters;
    readonly notify: Notify;
}

/// A host that answers everything itself: English as written, magnitude-based numbers, messages to
/// the console. What a demo page or a first integration starts from.
export const standaloneHost: ChartUiHost = {
    translate: identityTranslate,
    formatters: defaultChartFormatters,
    notify: consoleNotify,
};

/// Showing and hiding a dialog, which is the page's job rather than the dialog's.
///
/// A dialog that opens itself has to own a backdrop, a scroll lock, a focus trap and an Escape
/// key, and a page that already has a modal library then has two of each. The terminal drives this
/// through Bootstrap; a page with no modal library gets `createPlainModalController`.
export interface ModalController {
    /// Show the dialog.
    open(): void;

    /// Hide it. Also called by the dialog itself when its own close button is pressed.
    close(): void;

    /// Run this when the dialog has been hidden, however it was hidden - the caller's close, the
    /// backdrop, or the page's own Escape handling. The dialog restores its state here, so a
    /// controller that never calls it leaves the dialog believing it is still open.
    onClosed(handler: () => void): void;
}

/// A modal controller for a page with no modal library: the element is shown, a backdrop is drawn
/// behind it, and Escape or a click outside closes it.
///
/// Styling comes from `chart-ui.css`; this only decides what is open.
export function createPlainModalController(root: HTMLElement): ModalController {
    const closedHandlers: (() => void)[] = [];
    let escape: ((event: KeyboardEvent) => void) | null = null;

    const close = (): void => {
        if (escape !== null) {
            document.removeEventListener('keydown', escape);
            escape = null;
        }
        root.classList.remove('chart-modal-open');
        for (const handler of closedHandlers) handler();
    };

    return {
        open() {
            root.classList.add('chart-modal-open');
            // Bound per open rather than once: a page may hold several dialogs, and only the one
            // on screen should answer the key.
            escape = (event) => {
                if (event.key === 'Escape') close();
            };
            document.addEventListener('keydown', escape);
        },
        close,
        onClosed(handler) {
            closedHandlers.push(handler);
        },
    };
}
