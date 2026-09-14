import { Component, computed, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { CATEGORY_ART, ILLUSTRATIONS } from './illustrations';

/**
 * Renders one of the landing page's drawings.
 *
 * The markup comes from `illustrations.ts`, which is checked-in static data this
 * repo authors — never user input, never anything read back off the network — so
 * bypassing sanitisation here is bounded to our own file. Nothing dynamic is
 * interpolated into it, and an unknown name renders nothing rather than
 * throwing, so a typo shows as a gap instead of a blank page.
 *
 * Stroke colour and weight live in styles.css under `.pp-lp`, so a drawing
 * recolours with the page rather than carrying its own palette.
 */
@Component({
  selector: 'pp-illustration',
  standalone: true,
  template: `
    <svg [attr.viewBox]="viewBox()" [attr.aria-hidden]="true" focusable="false" [innerHTML]="markup()"></svg>
  `,
  styles: [':host { display: block; } svg { display: block; width: 100%; height: 100%; }'],
})
export class IllustrationComponent {
  private readonly sanitizer = inject(DomSanitizer);

  /** Key into ILLUSTRATIONS, or into CATEGORY_ART when `set` is "category". */
  name = input.required<string>();
  set = input<'step' | 'category'>('step');

  readonly viewBox = computed(() => (this.set() === 'category' ? '0 0 48 48' : '0 0 160 140'));

  readonly markup = computed<SafeHtml>(() => {
    const table: Record<string, string> = this.set() === 'category' ? CATEGORY_ART : ILLUSTRATIONS;
    return this.sanitizer.bypassSecurityTrustHtml(table[this.name()] ?? '');
  });
}
