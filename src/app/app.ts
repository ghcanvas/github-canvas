import { Component, HostListener } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

interface ContributionCell {
  date: Date;
  iso: string;
  inYear: boolean;
  active: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private static readonly WEEKS = 53;
  private static readonly DAYS = 7;
  private static readonly STORAGE_PREFIX = 'github-canvas-year:';
  private static readonly TEXT_PREFIX = 'github-canvas-text-year:';

  private static readonly FONT_START_ROW = 0;
  private static readonly FONT: Record<string, string[]> = {
    A: ['010', '101', '101', '111', '101', '101', '101'],
    B: ['110', '101', '101', '110', '101', '101', '110'],
    C: ['011', '100', '100', '100', '100', '100', '011'],
    D: ['110', '101', '101', '101', '101', '101', '110'],
    E: ['111', '100', '100', '110', '100', '100', '111'],
    F: ['111', '100', '100', '110', '100', '100', '100'],
    G: ['011', '100', '100', '101', '101', '101', '011'],
    H: ['101', '101', '101', '111', '101', '101', '101'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    J: ['001', '001', '001', '001', '001', '101', '010'],
    K: ['101', '101', '110', '100', '110', '101', '101'],
    L: ['100', '100', '100', '100', '100', '100', '111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['101', '111', '101', '101', '101', '101', '101'],
    O: ['010', '101', '101', '101', '101', '101', '010'],
    P: ['110', '101', '101', '110', '100', '100', '100'],
    Q: ['0110', '1001', '1001', '1001', '1001', '1010', '0101'],
    R: ['1110', '1001', '1001', '1110', '1010', '1001', '1001'],
    S: ['011', '100', '100', '010', '001', '001', '110'],
    T: ['111', '010', '010', '010', '010', '010', '010'],
    U: ['101', '101', '101', '101', '101', '101', '111'],
    V: ['101', '101', '101', '101', '101', '101', '010'],
    W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    X: ['101', '101', '101', '010', '101', '101', '101'],
    Y: ['101', '101', '101', '010', '010', '010', '010'],
    Z: ['111', '001', '001', '010', '100', '100', '111'],
    '!': ['1', '1', '1', '1', '1', '0', '1'],
    '?': ['110', '001', '001', '010', '010', '000', '010'],
  };

  readonly today = new Date();
  readonly years = this.buildYearRange(10);

  selectedYear = this.today.getFullYear();
  monthLabels: string[] = [];
  weeks: ContributionCell[][] = [];
  showClearConfirm = false;

  textInput = 'CODING IS COOL!';

  private isPainting = false;
  private paintValue: boolean | null = null;
  private hasPendingPaintChanges = false;

  constructor() {
    this.selectYear(this.selectedYear);
    this.textInput = this.clampTextToYear(this.sanitizeText(this.textInput));
  }

  get activeCount(): number {
    const cells = this.weeks.flat();
    return cells.filter((cell) => cell.inYear && cell.active).length;
  }

  get textColumnsHint(): string {
    const used = this.measureTextColumns(this.textInput);
    const max = this.getYearRenderableColumns();
    return `${used}/${max} columns`;
  }

  selectYear(year: number): void {
    this.endPainting();
    this.selectedYear = year;
    this.showClearConfirm = false;
    const selected = this.loadYearSelection(year);

    const firstDayOfYear = new Date(year, 0, 1);
    const firstGridDay = this.startOfWeek(firstDayOfYear);

    this.monthLabels = this.buildMonthLabels(year, firstGridDay);
    this.weeks = this.buildWeeks(firstGridDay, year, selected);
    const savedText = this.loadYearText(year);
    this.textInput = this.clampTextToYear(this.sanitizeText(savedText));
  }

  toggleCell(cell: ContributionCell): void {
    if (!cell.inYear) {
      return;
    }

    cell.active = !cell.active;
    this.persistYearSelection(this.selectedYear);
  }

  onCellMouseDown(event: MouseEvent, cell: ContributionCell): void {
    if (!cell.inYear || event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.showClearConfirm = false;
    this.isPainting = true;
    this.paintValue = !cell.active;
    this.applyPaint(cell);
  }

  onCellMouseEnter(cell: ContributionCell): void {
    if (!this.isPainting || this.paintValue === null) {
      return;
    }

    this.applyPaint(cell);
  }

  onTextInput(value: string): void {
    this.textInput = this.clampTextToYear(this.sanitizeText(value));
    this.renderTextPreview();
  }

  renderTextPreview(): void {
    this.endPainting();
    this.showClearConfirm = false;

    this.textInput = this.clampTextToYear(this.sanitizeText(this.textInput));
    this.setYearCellsActive(false);
    this.drawText(this.textInput);
    this.persistYearText(this.selectedYear, this.textInput);
    this.persistYearSelection(this.selectedYear);
  }

  requestClearYear(): void {
    this.showClearConfirm = true;
  }

  cancelClearYear(): void {
    this.showClearConfirm = false;
  }

  confirmClearYear(): void {
    this.setYearCellsActive(false);
    this.persistYearSelection(this.selectedYear);
    this.showClearConfirm = false;
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.endPainting();
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.endPainting();
  }

  isYearSelected(year: number): boolean {
    return this.selectedYear === year;
  }

  trackByWeek(index: number): number {
    return index;
  }

  trackByDay(index: number): number {
    return index;
  }

  private sanitizeText(raw: string): string {
    const uppercase = raw.toUpperCase();
    return Array.from(uppercase)
      .filter((char) => /[A-Z!? ]/.test(char))
      .join('');
  }

  private clampTextToYear(text: string): string {
    const maxColumns = this.getYearRenderableColumns();
    let output = '';

    for (const char of text) {
      const candidate = output + char;
      if (this.measureTextColumns(candidate) <= maxColumns) {
        output = candidate;
      } else {
        break;
      }
    }

    return output;
  }

  private getYearRenderableColumns(): number {
    if (this.weeks.length === 0) {
      return 0;
    }

    const range = this.getRenderableColumnRange();
    return Math.max(0, range.end - range.start + 1);
  }

  private measureTextColumns(text: string): number {
    let columns = 0;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      columns += this.getGlyphWidth(char);

      const hasNext = index < text.length - 1;
      const next = hasNext ? text[index + 1] : '';
      if (hasNext && char !== ' ' && next !== ' ') {
        columns += 1;
      }
    }

    return columns;
  }

  private drawText(text: string): void {
    const clean = this.clampTextToYear(this.sanitizeText(text));
    const range = this.getRenderableColumnRange();
    let cursor = range.start;

    for (let index = 0; index < clean.length; index += 1) {
      const char = clean[index];

      if (char === ' ') {
        cursor += this.getGlyphWidth(char);
        continue;
      }

      const glyph = App.FONT[char];
      if (!glyph) {
        continue;
      }
      const glyphWidth = glyph[0]?.length ?? 0;

      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyphWidth; col += 1) {
          const weekIndex = cursor + col;
          if (weekIndex > range.end) {
            continue;
          }

          if (glyph[row][col] === '1') {
            const dayIndex = App.FONT_START_ROW + row;
            this.setCellActive(weekIndex, dayIndex, true);
          }
        }
      }

      const hasNext = index < clean.length - 1;
      const next = hasNext ? clean[index + 1] : '';
      cursor += glyphWidth;
      if (hasNext && next !== ' ') {
        cursor += 1;
      }

      if (cursor > range.end) {
        break;
      }
    }
  }

  private getRenderableColumnRange(): { start: number; end: number } {
    const firstFullWeek = this.weeks.findIndex((week) => week.every((cell) => cell.inYear));
    const firstInYearWeek = this.weeks.findIndex((week) => week.some((cell) => cell.inYear));
    const start = firstFullWeek >= 0 ? firstFullWeek : Math.max(0, firstInYearWeek);

    let end = this.weeks.length - 1;
    for (let index = this.weeks.length - 1; index >= 0; index -= 1) {
      if (this.weeks[index].some((cell) => cell.inYear)) {
        end = index;
        break;
      }
    }

    return { start, end };
  }

  private setYearCellsActive(active: boolean): void {
    for (const cell of this.weeks.flat()) {
      if (cell.inYear) {
        cell.active = active;
      }
    }
  }

  private getGlyphWidth(char: string): number {
    if (char === ' ') {
      return 2;
    }

    const glyph = App.FONT[char];
    return glyph?.[0]?.length ?? 0;
  }

  private setCellActive(weekIndex: number, dayIndex: number, active: boolean): void {
    const week = this.weeks[weekIndex];
    if (!week) {
      return;
    }

    const cell = week[dayIndex];
    if (!cell || !cell.inYear) {
      return;
    }

    cell.active = active;
  }

  private applyPaint(cell: ContributionCell): void {
    if (!cell.inYear || this.paintValue === null || cell.active === this.paintValue) {
      return;
    }

    cell.active = this.paintValue;
    this.hasPendingPaintChanges = true;
  }

  private endPainting(): void {
    if (this.hasPendingPaintChanges) {
      this.persistYearSelection(this.selectedYear);
    }

    this.isPainting = false;
    this.paintValue = null;
    this.hasPendingPaintChanges = false;
  }

  private buildYearRange(totalYears: number): number[] {
    const currentYear = this.today.getFullYear();
    return Array.from({ length: totalYears }, (_, index) => currentYear - index);
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    copy.setDate(copy.getDate() - copy.getDay());
    return copy;
  }

  private formatIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildWeeks(startDate: Date, year: number, selected: Set<string>): ContributionCell[][] {
    return Array.from({ length: App.WEEKS }, (_, weekIndex) => {
      return Array.from({ length: App.DAYS }, (_, dayIndex) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + weekIndex * App.DAYS + dayIndex);

        const iso = this.formatIso(date);
        const inYear = date.getFullYear() === year;

        return {
          date,
          iso,
          inYear,
          active: inYear && selected.has(iso),
        };
      });
    });
  }

  private buildMonthLabels(year: number, gridStart: Date): string[] {
    const labels = Array.from({ length: App.WEEKS }, () => '');

    for (let month = 0; month < 12; month += 1) {
      const firstOfMonth = new Date(year, month, 1);
      const daysFromStart = Math.floor(
        (firstOfMonth.getTime() - gridStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      const weekIndex = Math.floor(daysFromStart / App.DAYS);

      if (weekIndex >= 0 && weekIndex < App.WEEKS && labels[weekIndex] === '') {
        labels[weekIndex] = firstOfMonth.toLocaleString('en-US', { month: 'short' });
      }
    }

    return labels;
  }

  private persistYearSelection(year: number): void {
    const activeIsos = this.weeks
      .flat()
      .filter((cell) => cell.inYear && cell.active)
      .map((cell) => cell.iso);

    localStorage.setItem(`${App.STORAGE_PREFIX}${year}`, JSON.stringify(activeIsos));
  }

  private persistYearText(year: number, text: string): void {
    localStorage.setItem(`${App.TEXT_PREFIX}${year}`, text);
  }

  private loadYearSelection(year: number): Set<string> {
    const raw = localStorage.getItem(`${App.STORAGE_PREFIX}${year}`);

    if (!raw) {
      return new Set<string>();
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set<string>(parsed);
      }
      return new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  private loadYearText(year: number): string {
    const raw = localStorage.getItem(`${App.TEXT_PREFIX}${year}`);
    return raw ?? this.textInput;
  }
}
