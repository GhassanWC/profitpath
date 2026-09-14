import { Component, HostListener, ElementRef, inject, signal } from '@angular/core';
import { I18nService } from './i18n.service';
import { IconComponent } from './icon.component';

/**
 * Language switcher. Each language is listed in its own script — a reader who
 * cannot read the current interface must still be able to find their own name
 * for their own language.
 */
@Component({
  selector: 'pp-language-picker',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="pp-lang">
      <button
        type="button"
        class="pp-lang__button"
        (click)="open.set(!open())"
        [attr.aria-expanded]="open()"
        aria-haspopup="listbox"
        [attr.aria-label]="t('lang.change')"
      >
        <pp-icon name="languages" [size]="15" />
        <span class="pp-lang__code">{{ i18n.def().code.toUpperCase() }}</span>
      </button>

      @if (open()) {
        <ul class="pp-lang__menu" role="listbox" [attr.aria-label]="t('lang.change')">
          @for (l of i18n.locales; track l.code) {
            <li>
              <button
                type="button"
                role="option"
                [attr.aria-selected]="l.code === i18n.locale()"
                class="pp-lang__item"
                [class.selected]="l.code === i18n.locale()"
                [attr.lang]="l.code"
                [attr.dir]="l.dir"
                (click)="choose(l.code)"
              >
                <span class="name">{{ l.label }}</span>
                <span class="sub">{{ l.englishLabel }}</span>
                @if (l.code === i18n.locale()) {
                  <pp-icon name="check" [size]="14" />
                }
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class LanguagePickerComponent {
  readonly i18n = inject(I18nService);
  readonly t = this.i18n.t;
  readonly open = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);

  choose(code: string): void {
    this.i18n.setLocale(code);
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
