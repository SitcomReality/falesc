import { SERVICE_HOURS } from '../../services/ServicePolicies.js';
import { SERVICE_VIBES } from '../../services/ServiceVibes.js';
import { SERVICE_ACCESS } from '../../services/ServiceAccess.js';
import { escapeHtml } from '../chrome/escapeHtml.js';

/** The static service-record panel; `show()` fills its data-role slots. */
export function serviceCardMarkup() {
    return `
            <div class="modal__head">
                <div>
                    <p class="kicker" style="color:var(--wine)">Service record</p>
                    <div class="service-card__title-row">
                        <h3 class="modal__title" id="structure-modal-title" data-role="name">Canteen</h3>
                        <button type="button" class="service-card__rename" data-testid="service-rename">Rename</button>
                    </div>
                </div>
                <button type="button" class="modal__close" data-testid="structure-close" aria-label="Close service record">×</button>
            </div>
            <div class="service-rename" data-role="rename-row" hidden>
                <input class="modal__input" data-testid="service-name-input" maxlength="32" aria-label="Service name">
                <button type="button" class="btn btn--small btn--mint" data-testid="service-name-save">Save name</button>
                <button type="button" class="btn btn--small btn--paper" data-testid="service-name-cancel">Cancel</button>
            </div>
            <div class="blueprint-summary">
                <span class="blueprint-summary__icon" data-role="icon" aria-hidden="true"></span>
                <span class="blueprint-summary__body">
                    <span class="blueprint-summary__name" data-role="program">Canteen</span>
                    <span class="blueprint-summary__stats" data-role="stats"></span>
                </span>
            </div>
            <p class="modal__blurb" data-role="blurb"></p>
            <dl class="service-facts" data-role="facts"></dl>
            <div class="service-policy-row">
                <label class="service-hours" data-role="hours-wrap" hidden>Hours
                    <select data-testid="service-hours">${SERVICE_HOURS.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
                </label>
                <label class="service-hours" data-role="vibe-wrap" hidden>Atmosphere
                    <select data-testid="service-vibe">${SERVICE_VIBES.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
                </label>
                <label class="service-hours" data-role="access-wrap" hidden>Welcome
                    <select data-testid="service-access">${SERVICE_ACCESS.map((entry) => `<option value="${entry.id}">${escapeHtml(entry.name)}</option>`).join('')}</select>
                </label>
                <label class="service-hours" data-role="focus-wrap" hidden>Focus
                    <select data-testid="service-focus"></select>
                </label>
            </div>
            <div class="service-interior" data-role="interior"></div>
            <div class="service-regulars" data-role="regulars" hidden></div>
            <p class="modal__note" data-role="note"></p>
            <p class="modal__error" data-role="error" aria-live="polite"></p>
            <div class="modal__actions">
                <button type="button" class="btn btn--paper" data-testid="service-interior-open">Step inside</button>
                <button type="button" class="btn btn--paper" data-testid="structure-cancel">Keep it</button>
                <button type="button" class="btn btn--mint" data-testid="structure-upgrade" hidden>Retrofit</button>
                <button type="button" class="btn btn--paper" data-testid="structure-floor" hidden>Add a floor · 4</button>
                <button type="button" class="btn btn--mint" data-testid="structure-reopen" hidden>Reopen</button>
                <button type="button" class="btn btn--mint" data-testid="structure-repair" hidden>Repair · 3</button>
                <button type="button" class="btn btn--danger" data-testid="structure-demolish">Dismantle</button>
            </div>
        `;
}
