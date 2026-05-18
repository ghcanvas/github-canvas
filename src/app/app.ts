import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { MainService, AuthUser, PublishPlanResponse, UserPlan } from './services/main-service';

interface ContributionCell {
  date: Date;
  iso: string;
  inYear: boolean;
  active: boolean;
}

interface DemoPreset {
  label: string;
  value: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgFor, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private static readonly WEEKS = 53;
  private static readonly DAYS = 7;
  private static readonly YEAR_WINDOW_RADIUS = 2;
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
    '0': ['010', '101', '101', '101', '101', '101', '010'],
    '1': ['010', '110', '010', '010', '010', '010', '111'],
    '2': ['110', '001', '001', '010', '100', '100', '111'],
    '3': ['110', '001', '001', '010', '001', '001', '110'],
    '4': ['101', '101', '101', '111', '001', '001', '001'],
    '5': ['111', '100', '100', '110', '001', '001', '110'],
    '6': ['011', '100', '100', '110', '101', '101', '010'],
    '7': ['111', '001', '001', '010', '010', '010', '010'],
    '8': ['010', '101', '101', '010', '101', '101', '010'],
    '9': ['010', '101', '101', '011', '001', '001', '110'],
    '!': ['1', '1', '1', '1', '1', '0', '1'],
    '?': ['110', '001', '001', '010', '010', '000', '010'],
  };

  readonly today = new Date();
  readonly heroBeforeCells = App.buildNoiseCells(App.WEEKS);
  readonly heroAfterCells = App.buildTextCells('BTC', App.WEEKS);
  readonly btcMiniCells = App.buildTextCells('BTC', 24);
  readonly primaryPresets: DemoPreset[] = [
    { label: 'BTC', value: 'BTC' },
    { label: 'Bitcoin', value: 'BITCOIN' },
    { label: 'HODL', value: 'HODL' },
    { label: 'Coding is cool', value: 'CODING IS COOL!' },
    { label: '2026', value: '2026' },
    { label: 'GM', value: 'GM' },
  ];
  readonly extraPresets: DemoPreset[] = [
    { label: 'Build', value: 'BUILD' },
    { label: 'Ship', value: 'SHIP' },
    { label: 'Launch', value: 'LAUNCH' },
    { label: 'Open source', value: 'OPEN SOURCE' },
  ];

  selectedYear = this.today.getFullYear();
  monthLabels: string[] = [];
  weeks: ContributionCell[][] = [];
  showClearConfirm = false;
  showBrandModal = false;
  showMorePresets = false;

  textInput = 'CODING IS COOL!';

  currentUser: AuthUser | null = null;
  showUserMenu = false;

  isCheckingAuth = true;
  isSigningIn = false;
  isLoggingOut = false;
  isLoadingPlan = false;
  isSavingPlan = false;
  isPublishingPlan = false;
  planStatusMessage = '';
  publishStatusMessage = '';
  publishedRepoUrl = '';

  private isPainting = false;
  private paintValue: boolean | null = null;
  private hasPendingPaintChanges = false;
  private planLoadRequestId = 0;
  private readonly publishedYears = new Set<number>();

  private static buildNoiseCells(columns: number): boolean[] {
    return Array.from({ length: columns * App.DAYS }, (_, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return (col * 3 + row * 11) % 37 === 0 || (col + row * 5) % 53 === 0;
    });
  }

  private static buildTextCells(text: string, columns: number): boolean[] {
    const cells = Array.from({ length: columns * App.DAYS }, () => false);
    let cursor = Math.max(0, Math.floor((columns - App.measureStaticTextColumns(text)) / 2));

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const glyph = App.FONT[char];

      if (!glyph) {
        cursor += char === ' ' ? 2 : 0;
        continue;
      }

      const glyphWidth = glyph[0]?.length ?? 0;
      for (let row = 0; row < glyph.length; row += 1) {
        for (let col = 0; col < glyphWidth; col += 1) {
          if (glyph[row][col] === '1') {
            const cellIndex = row * columns + cursor + col;
            if (cellIndex < cells.length) {
              cells[cellIndex] = true;
            }
          }
        }
      }

      const hasNext = index < text.length - 1;
      const next = hasNext ? text[index + 1] : '';
      cursor += glyphWidth;
      if (hasNext && next !== ' ') {
        cursor += 1;
      }
    }

    return cells;
  }

  private static measureStaticTextColumns(text: string): number {
    let columns = 0;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const glyph = App.FONT[char];
      columns += char === ' ' ? 2 : (glyph?.[0]?.length ?? 0);

      const hasNext = index < text.length - 1;
      const next = hasNext ? text[index + 1] : '';
      if (hasNext && char !== ' ' && next !== ' ') {
        columns += 1;
      }
    }

    return columns;
  }

  constructor(
    public readonly mainService: MainService,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {
    this.selectYear(this.selectedYear);
    this.textInput = this.clampTextToYear(this.sanitizeText(this.textInput));
  }

  ngOnInit(): void {
    this.mainService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      this.isCheckingAuth = false;
      this.isSigningIn = false;
      this.isLoggingOut = false;
      this.hydrateYearFromLocal(this.selectedYear);
      this.loadPlanForYear(this.selectedYear);
      this.changeDetectorRef.detectChanges();
    });

    this.refreshAuth();
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

  get headerTitle(): string {
    return this.currentUser ? `Welcome ${this.currentUser.login}` : 'GitHubCanvas.com';
  }

  get menuAvatarSrc(): string {
    return this.currentUser?.avatarUrl ?? '/github-canvas-avatar.jpg';
  }

  get menuAvatarAlt(): string {
    return this.currentUser ? `${this.currentUser.login} avatar` : 'User avatar';
  }

  get showAuthSpinner(): boolean {
    return this.isCheckingAuth || this.isSigningIn || this.isLoggingOut;
  }

  get visibleYears(): number[] {
    return this.buildYearWindow(this.selectedYear);
  }

  get visiblePresets(): DemoPreset[] {
    return this.showMorePresets
      ? [...this.primaryPresets, ...this.extraPresets]
      : this.primaryPresets;
  }

  get saveButtonLabel(): string {
    if (this.isSavingPlan) {
      return 'Saving...';
    }

    return 'Save';
  }

  get publishButtonLabel(): string {
    if (this.isPublishingPlan) {
      return this.isSelectedYearPublished ? 'Updating...' : 'Publishing...';
    }

    return this.isSelectedYearPublished ? 'Update Published Canvas' : 'Publish to GitHub';
  }

  get isSelectedYearPublished(): boolean {
    return this.publishedYears.has(this.selectedYear);
  }

  signIn(): void {
    if (this.showAuthSpinner) {
      return;
    }

    this.showUserMenu = false;
    this.isSigningIn = true;
    this.mainService.loginWithGitHub();
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.currentUser || this.showAuthSpinner) {
      return;
    }

    this.showUserMenu = !this.showUserMenu;
  }

  logOut(): void {
    if (this.showAuthSpinner) {
      return;
    }

    this.showUserMenu = false;
    this.currentUser = null;
    this.isLoggingOut = true;
    this.mainService.logOut();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showUserMenu = false;
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.showUserMenu = false;
    this.showBrandModal = false;
  }

  @HostListener('window:pageshow')
  onPageShow(): void {
    this.refreshAuthSilently();
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    this.refreshAuthSilently();
  }

  selectYear(year: number): void {
    this.endPainting();
    this.selectedYear = year;
    this.showClearConfirm = false;
    this.planStatusMessage = '';
    this.publishStatusMessage = '';
    this.publishedRepoUrl = '';
    this.hydrateYearFromLocal(year);
    this.loadPlanForYear(year);
  }

  selectPreviousYear(): void {
    this.selectYear(this.selectedYear - 1);
  }

  selectNextYear(): void {
    this.selectYear(this.selectedYear + 1);
  }

  selectCurrentYear(): void {
    this.selectYear(this.today.getFullYear());
  }

  applyPreset(preset: DemoPreset): void {
    this.textInput = this.clampTextToYear(this.sanitizeText(preset.value));
    this.renderTextPreview();
  }

  toggleMorePresets(): void {
    this.showMorePresets = !this.showMorePresets;
  }

  saveCurrentPlan(): void {
    if (!this.currentUser || this.isSavingPlan) {
      this.planStatusMessage = this.currentUser ? this.planStatusMessage : 'Sign in to save plans.';
      return;
    }

    const year = this.selectedYear;
    const activeIsos = this.getActiveIsos();
    const text = this.textInput;

    this.persistYearSelection(year);
    this.persistYearText(year, text);
    this.planStatusMessage = '';
    this.isSavingPlan = true;

    this.mainService.savePlan(year, { activeIsos, text }).subscribe({
      next: (plan) => {
        this.isSavingPlan = false;

        if (!plan) {
          this.planStatusMessage = `Save failed for ${year}.`;
          this.changeDetectorRef.detectChanges();
          return;
        }

        this.persistRemotePlanLocally(year, plan);
        this.planStatusMessage = `Saved ${year}.`;
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.isSavingPlan = false;
        this.planStatusMessage = `Save failed for ${year}.`;
        this.changeDetectorRef.detectChanges();
      },
    });
  }

  publishCurrentPlan(): void {
    if (!this.currentUser || this.isPublishingPlan) {
      this.publishStatusMessage = this.currentUser ? this.publishStatusMessage : 'Sign in to publish.';
      return;
    }

    const year = this.selectedYear;
    const isPublished = this.isSelectedYearPublished;
    const request = isPublished
      ? this.mainService.republishPlan(year)
      : this.mainService.publishPlan(year);

    this.publishStatusMessage = '';
    this.publishedRepoUrl = '';
    this.isPublishingPlan = true;

    request.subscribe({
      next: (response) => {
        this.isPublishingPlan = false;

        if (year !== this.selectedYear) {
          this.changeDetectorRef.detectChanges();
          return;
        }

        if (!response?.ok) {
          this.publishStatusMessage = `${isPublished ? 'Update' : 'Publish'} failed for ${year}.`;
          this.changeDetectorRef.detectChanges();
          return;
        }

        this.markYearPublished(year, response);
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.isPublishingPlan = false;
        if (year !== this.selectedYear) {
          this.changeDetectorRef.detectChanges();
          return;
        }

        this.publishStatusMessage = `${isPublished ? 'Update' : 'Publish'} failed for ${year}.`;
        this.changeDetectorRef.detectChanges();
      },
    });
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

  openBrandModal(event?: MouseEvent): void {
    event?.stopPropagation();
    this.showBrandModal = true;
  }

  closeBrandModal(): void {
    this.showBrandModal = false;
  }

  isYearSelected(year: number): boolean {
    return this.selectedYear === year;
  }

  isPresetSelected(preset: DemoPreset): boolean {
    return this.sanitizeText(preset.value) === this.textInput;
  }

  trackByYear(_index: number, year: number): number {
    return year;
  }

  trackByPreset(_index: number, preset: DemoPreset): string {
    return preset.value;
  }

  trackByWeek(index: number): number {
    return index;
  }

  trackByDay(index: number): number {
    return index;
  }

  private refreshAuth(): void {
    this.isCheckingAuth = true;
    this.mainService.loadCurrentUser().subscribe({
      next: () => {
        this.isCheckingAuth = false;
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.isCheckingAuth = false;
        this.changeDetectorRef.detectChanges();
      },
    });
  }

  private refreshAuthSilently(): void {
    if (this.isSigningIn || this.isLoggingOut) {
      return;
    }

    this.mainService.loadCurrentUser().subscribe();
  }

  private sanitizeText(raw: string): string {
    const uppercase = raw.toUpperCase();
    return Array.from(uppercase)
      .filter((char) => /[A-Z0-9!? ]/.test(char))
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

  private buildYearWindow(centerYear: number): number[] {
    const totalYears = App.YEAR_WINDOW_RADIUS * 2 + 1;
    return Array.from(
      { length: totalYears },
      (_, index) => centerYear + App.YEAR_WINDOW_RADIUS - index,
    );
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
    localStorage.setItem(`${App.STORAGE_PREFIX}${year}`, JSON.stringify(this.getActiveIsos()));
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

  private hydrateYearFromLocal(year: number): void {
    const selected = this.loadYearSelection(year);
    const firstDayOfYear = new Date(year, 0, 1);
    const firstGridDay = this.startOfWeek(firstDayOfYear);

    this.monthLabels = this.buildMonthLabels(year, firstGridDay);
    this.weeks = this.buildWeeks(firstGridDay, year, selected);
    const savedText = this.loadYearText(year);
    this.textInput = this.clampTextToYear(this.sanitizeText(savedText));
  }

  private loadPlanForYear(year: number): void {
    if (!this.currentUser) {
      this.isLoadingPlan = false;
      this.planStatusMessage = '';
      return;
    }

    const requestId = ++this.planLoadRequestId;
    this.isLoadingPlan = true;
    this.planStatusMessage = '';

    this.mainService.loadPlan(year).subscribe({
      next: (plan) => {
        if (requestId !== this.planLoadRequestId || year !== this.selectedYear) {
          return;
        }

        this.isLoadingPlan = false;

        if (!plan) {
          this.planStatusMessage = '';
          this.changeDetectorRef.detectChanges();
          return;
        }

        this.applyRemotePlan(year, plan);
        this.planStatusMessage = `Loaded saved plan for ${year}.`;
        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        if (requestId !== this.planLoadRequestId || year !== this.selectedYear) {
          return;
        }

        this.isLoadingPlan = false;
        this.planStatusMessage = '';
        this.changeDetectorRef.detectChanges();
      },
    });
  }

  private applyRemotePlan(year: number, plan: UserPlan): void {
    const activeIsos = this.normalizeActiveIsos(plan.activeIsos);
    const text = this.clampTextToYear(this.sanitizeText(plan.text ?? ''));

    this.setYearSelection(new Set(activeIsos));
    this.textInput = text;
    this.persistRemotePlanLocally(year, plan);
  }

  private persistRemotePlanLocally(year: number, plan: UserPlan): void {
    const activeIsos = this.normalizeActiveIsos(plan.activeIsos);
    localStorage.setItem(`${App.STORAGE_PREFIX}${year}`, JSON.stringify(activeIsos));
    localStorage.setItem(`${App.TEXT_PREFIX}${year}`, this.sanitizeText(plan.text ?? ''));
  }

  private markYearPublished(year: number, response: PublishPlanResponse): void {
    this.publishedYears.add(year);
    this.publishedRepoUrl = response.repo?.url ?? '';
    this.publishStatusMessage = this.publishedRepoUrl
      ? `Published ${year}: ${this.publishedRepoUrl}`
      : response.message;
  }

  private normalizeActiveIsos(value: string[] | string | null | undefined): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }

    if (typeof value !== 'string') {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  }

  private setYearSelection(selected: Set<string>): void {
    for (const cell of this.weeks.flat()) {
      cell.active = cell.inYear && selected.has(cell.iso);
    }
  }

  private getActiveIsos(): string[] {
    return this.weeks
      .flat()
      .filter((cell) => cell.inYear && cell.active)
      .map((cell) => cell.iso);
  }
}
