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

  readonly today = new Date();
  readonly years = this.buildYearRange(10);

  selectedYear = this.today.getFullYear();
  monthLabels: string[] = [];
  weeks: ContributionCell[][] = [];
  showClearConfirm = false;

  private isPainting = false;
  private paintValue: boolean | null = null;
  private hasPendingPaintChanges = false;

  constructor() {
    this.selectYear(this.selectedYear);
  }

  get activeCount(): number {
    const cells = this.weeks.flat();
    return cells.filter((cell) => cell.inYear && cell.active).length;
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

  requestClearYear(): void {
    this.showClearConfirm = true;
  }

  cancelClearYear(): void {
    this.showClearConfirm = false;
  }

  confirmClearYear(): void {
    for (const cell of this.weeks.flat()) {
      if (cell.inYear) {
        cell.active = false;
      }
    }

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
}
