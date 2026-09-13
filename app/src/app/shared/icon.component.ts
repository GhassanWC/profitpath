import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICONS } from './icons';

/**
 * Renders one icon from the inlined Lucide set.
 *
 * Icons are decorative by default: they sit beside a text label that already
 * carries the meaning, so the <svg> is aria-hidden. Pass `label` for the rare
 * icon that stands alone.
 */
@Component({
  selector: 'pp-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.role]="label() ? 'img' : null"
      [attr.aria-label]="label() || null"
      [attr.aria-hidden]="label() ? null : 'true'"
      [innerHTML]="markup()"
    ></svg>
  `,
  styles: [':host { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; }'],
})
export class IconComponent {
  name = input.required<string>();
  size = input(16);
  strokeWidth = input(1.75);
  label = input('');

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * The markup comes from ICONS — a compile-time constant in this repo, never
   * from user input or the network — so bypassing the sanitiser is safe here and
   * is what keeps the SVG children from being stripped.
   */
  readonly markup = computed(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name() as keyof typeof ICONS] ?? ''));
}
