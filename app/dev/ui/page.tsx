"use client";

import * as React from "react";
import {
  Button,
  IconButton,
} from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioCards } from "@/components/ui/radio-cards";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { NumberStepper } from "@/components/ui/number-stepper";
import { FormField } from "@/components/ui/form-field";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge, Chip } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { TeamLogo } from "@/components/ui/team-logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster, toast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { LoadMore, Pagination } from "@/components/ui/pagination";
import { Stepper } from "@/components/ui/stepper";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatTile } from "@/components/ui/stat-tile";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/ui/copy-button";
import { LiveStrip } from "@/components/ui/live-strip";
import { ImageUploader } from "@/components/ui/image-uploader";
import { setTheme } from "@/lib/theme";
import {
  Bell,
  Copy,
  Moon,
  Sun,
  Trophy,
} from "lucide-react";

export default function DevUiCatalog() {
  const [currentTheme, setCurrentTheme] = React.useState<"light" | "dark">("light");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [comboboxVal, setComboboxVal] = React.useState("raipur");
  const [radioCardVal, setRadioCardVal] = React.useState("league");
  const [stepperStep, setStepperStep] = React.useState(1);
  const [checkboxVal, setCheckboxVal] = React.useState(true);
  const [switchVal, setSwitchVal] = React.useState(true);
  const [stepperNum, setStepperNum] = React.useState(11);

  const toggleTheme = (theme: "light" | "dark") => {
    setCurrentTheme(theme);
    setTheme(theme);
  };

  const sampleTableData = [
    { id: "1", team: "Raipur Royals", played: 5, won: 4, points: 8, nrr: "+1.250" },
    { id: "2", team: "Bhilai Blasters", played: 5, won: 3, points: 6, nrr: "+0.450" },
    { id: "3", team: "Durg Dragons", played: 5, won: 2, points: 4, nrr: "-0.210" },
  ];

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-8 font-body text-ink space-y-12 max-w-7xl mx-auto">
      <Toaster />

      {/* Live Strip Demo */}
      <LiveStrip
        title="Raipur Premier League 2026 Auction, Lot 14 of 60"
        href="#live"
      />

      {/* Header & Theme Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
            UI Component Library
          </h1>
          <p className="text-sm text-muted mt-1">
            Stadium Floodlights Design System • Light & Dark mode validation
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-input border border-line">
          <Button
            size="sm"
            variant={currentTheme === "light" ? "primary" : "ghost"}
            onClick={() => toggleTheme("light")}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
          </Button>
          <Button
            size="sm"
            variant={currentTheme === "dark" ? "primary" : "ghost"}
            onClick={() => toggleTheme("dark")}
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
          </Button>
        </div>
      </div>

      {/* Section 1: Buttons & IconButtons */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">1. Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" loading>
            Loading Button
          </Button>
          <Button variant="primary" disabled>
            Disabled Button
          </Button>
          <IconButton aria-label="Notifications" variant="secondary">
            <Bell className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button size="sm">Small (36px)</Button>
          <Button size="md">Medium (44px)</Button>
          <Button size="lg">Large (48px)</Button>
        </div>
      </section>

      {/* Section 2: Form Controls */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-ink">
          2. Form Inputs & Controls
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField label="Text Input" helper="Standard 44px text input">
            <Input placeholder="Enter tournament name" />
          </FormField>

          <FormField
            label="Input with Error"
            error="Please enter a valid team name"
          >
            <Input defaultValue="Invalid!" />
          </FormField>

          <FormField label="Combobox (Searchable)">
            <Combobox
              options={[
                { value: "raipur", label: "Raipur", hint: "Chhattisgarh" },
                { value: "bhilai", label: "Bhilai", hint: "Chhattisgarh" },
                { value: "bilaspur", label: "Bilaspur", hint: "Chhattisgarh" },
                { value: "durg", label: "Durg", hint: "Chhattisgarh" },
              ]}
              value={comboboxVal}
              onChange={setComboboxVal}
            />
          </FormField>

          <FormField label="Select Dropdown">
            <Select defaultValue="cricket">
              <SelectTrigger>
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cricket">Cricket</SelectItem>
                <SelectItem value="football">Football</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Date Picker">
            <DatePicker />
          </FormField>

          <FormField label="Date Time Picker">
            <DateTimePicker />
          </FormField>

          <FormField label="Number Stepper">
            <NumberStepper
              value={stepperNum}
              onChange={setStepperNum}
              min={1}
              max={25}
            />
          </FormField>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-ink">Toggles</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={checkboxVal}
                  onCheckedChange={setCheckboxVal}
                />
                <span className="text-sm text-ink">Open Registration</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={switchVal}
                  onCheckedChange={setSwitchVal}
                  aria-label="Toggle notifications"
                />
                <span className="text-sm text-ink">Live Updates</span>
              </div>
            </div>
          </div>
        </div>

        <FormField label="Textarea">
          <Textarea placeholder="Enter tournament rules and prize details..." />
        </FormField>

        {/* Radio Cards */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Radio Cards</h3>
          <RadioCards
            items={[
              {
                value: "league",
                title: "Round Robin League",
                description:
                  "Every team plays every other team once or twice. Top teams advance to playoffs.",
                badge: "Recommended",
              },
              {
                value: "knockout",
                title: "Single Elimination Knockout",
                description:
                  "Lose once and you are out. Ideal for short weekend cups.",
              },
            ]}
            value={radioCardVal}
            onChange={setRadioCardVal}
          />
        </div>

        {/* Form Error Summary */}
        <FormErrorSummary
          errors={[
            {
              fieldId: "name",
              label: "Tournament Name",
              message: "Please enter a name with at least 3 characters",
            },
            {
              fieldId: "city",
              label: "City",
              message: "Please select an active city from the list",
            },
          ]}
        />
      </section>

      {/* Section 3: Tabs & Accordion */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          3. Tabs & Accordion
        </h2>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams" badge={8}>
              Teams
            </TabsTrigger>
            <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card>
              <CardContent className="pt-5">
                Overview tab content showing tournament overview details.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="teams">
            <Card>
              <CardContent className="pt-5">
                Teams tab content showing 8 registered teams.
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="fixtures">
            <Card>
              <CardContent className="pt-5">Fixtures tab content.</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="standings">
            <Card>
              <CardContent className="pt-5">Standings tab content.</CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="faq-1">
            <AccordionTrigger>
              How does the live auction work?
            </AccordionTrigger>
            <AccordionContent>
              The auctioneer selects a player from the pool, opens bidding, and
              registered team managers place bids in real time. The server
              enforces purse and squad limits with row locks.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger>What are the squad rules?</AccordionTrigger>
            <AccordionContent>
              Each squad must meet the minimum and maximum player count configured
              by the organizer.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Section 4: Badges & Chips */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          4. Status Badges & Chips
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge status="Draft" />
          <Badge status="Open" />
          <Badge status="Live" />
          <Badge status="Completed" />
          <Badge status="Cancelled" />
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Chip selected>Raipur</Chip>
          <Chip onRemove={() => {}}>Cricket</Chip>
          <Chip onRemove={() => {}}>Under 21</Chip>
        </div>
      </section>

      {/* Section 5: Cards, Skeletons, EmptyState, Avatar, TeamLogo */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-ink">
          5. Cards & Imagery
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card sport="cricket">
            <CardHeader>
              <CardTitle>Raipur Premier League</CardTitle>
              <CardDescription>Cricket • 8 Teams • Starts Dec 14</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <TeamLogo name="Raipur Royals" size="md" />
                <span className="font-semibold text-sm">Raipur Royals</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button size="sm">View Tournament</Button>
            </CardFooter>
          </Card>

          <Card sport="football">
            <CardHeader>
              <CardTitle>Bhilai Football Cup</CardTitle>
              <CardDescription>Football • Knockout • Nov 20</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar name="Rahul Sharma" size="md" />
                <div>
                  <div className="text-sm font-semibold">Rahul Sharma</div>
                  <div className="text-xs text-muted">Captain</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Details
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skeleton State</CardTitle>
              <CardDescription>Reduced-motion compliant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        </div>

        <EmptyState
          title="No tournaments found"
          description="There are currently no published tournaments matching your search in this city."
          action={<Button size="sm">Browse all cities</Button>}
        />
      </section>

      {/* Section 6: Dialog, ConfirmDialog, Sheet, Toast */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          6. Overlays & Feedback
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open Dialog
          </Button>

          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Open Confirm Dialog
          </Button>

          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Mobile Sheet
          </Button>

          <Button
            onClick={() =>
              toast({
                title: "Tournament published.",
                description: "Your tournament is now live and visible to players.",
                variant: "success",
              })
            }
          >
            Show Success Toast
          </Button>

          <Button
            variant="destructive"
            onClick={() =>
              toast({
                title: "Error occurred.",
                description: "Something went wrong. Try again.",
                variant: "danger",
              })
            }
          >
            Show Error Toast
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Manager</DialogTitle>
              <DialogDescription>
                Share this invite link with the manager. The link is valid for 14
                days.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 flex items-center gap-2">
              <Input
                readOnly
                value="https://play.local/join/inv_8271a"
                className="font-mono text-xs"
              />
              <CopyButton value="https://play.local/join/inv_8271a" />
            </div>
            <DialogFooter>
              <Button onClick={() => setDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete Tournament Draft"
          itemName="Raipur Premier League"
          description="Are you sure you want to delete this draft tournament? This action cannot be undone."
          confirmLabel="Delete Draft"
          variant="destructive"
          onConfirm={() => {
            toast({
              title: "Draft deleted.",
              description: "The tournament draft was removed.",
              variant: "danger",
            });
          }}
        />

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Mobile Workspace Navigation</SheetTitle>
              <SheetDescription>
                Quick actions and additional tournament management tools.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                My Teams
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Auction Hub
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                Settings
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </section>

      {/* Section 7: Data Table & Pagination */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          7. Data Table & Pagination
        </h2>
        <DataTable
          columns={[
            {
              key: "team",
              header: "Team",
              cell: (row) => (
                <div className="flex items-center gap-2 font-semibold">
                  <TeamLogo name={row.team} size="sm" />
                  <span>{row.team}</span>
                </div>
              ),
            },
            { key: "played", header: "P", cell: (row) => row.played, align: "center" },
            { key: "won", header: "W", cell: (row) => row.won, align: "center" },
            {
              key: "points",
              header: "PTS",
              cell: (row) => <span className="font-bold">{row.points}</span>,
              align: "center",
            },
            { key: "nrr", header: "NRR", cell: (row) => row.nrr, align: "right" },
          ]}
          data={sampleTableData}
          keyExtractor={(row) => row.id}
          renderMobileCard={(row) => (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <TeamLogo name={row.team} size="sm" />
                <span>{row.team}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>{row.points} pts</span>
                <span className="text-muted text-xs">{row.nrr}</span>
              </div>
            </div>
          )}
        />
        <Pagination
          currentPage={1}
          totalPages={3}
          hasPrevious={false}
          hasNext={true}
          onPrevious={() => {}}
          onNext={() => {}}
        />
        <LoadMore hasMore={true} onLoadMore={() => {}} />
      </section>

      {/* Section 8: Stepper, ProgressBar, StatTiles, Tooltip */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-bold text-ink">
          8. Stats & Utilities
        </h2>
        <Stepper
          steps={[
            { id: 1, label: "Basics", description: "Name & Sport" },
            { id: 2, label: "Teams", description: "Entry & Squads" },
            { id: 3, label: "Payment", description: "Organizer Fee" },
            { id: 4, label: "Publish", description: "Go Live" },
          ]}
          currentStepIndex={stepperStep}
          onStepClick={setStepperStep}
        />

        <ProgressBar value={65} label="Squad Completion" showPercent />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile
            label="Total Purse"
            value="10,000"
            subValue="pts"
            trend="up"
            trendLabel="+1,500 bonus"
            icon={<Trophy className="h-5 w-5" />}
          />
          <StatTile
            label="Current Bid"
            value="1,200"
            subValue="pts"
            trend="up"
            trendLabel="Going twice"
          />
          <StatTile
            label="Squad Count"
            value="14"
            subValue="/ 16 max"
            trend="neutral"
            trendLabel="2 slots open"
          />
        </div>

        <div className="flex items-center gap-4">
          <SimpleTooltip content="Click to copy team invite link">
            <Button variant="secondary" size="sm">
              <Copy className="h-4 w-4" />
              Hover for Tooltip
            </Button>
          </SimpleTooltip>
          <CopyButton value="https://play.local/tournaments/raipur-premier-league" />
        </div>
      </section>

      {/* Section 9: Image Uploader */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-ink">
          9. Image Uploader
        </h2>
        <p className="text-sm text-muted">
          Auto-resizes client-side to max 1600px WebP 0.85 before upload.
        </p>
        <ImageUploader bucket="tournament-banners" aspectRatio="16:9" />
      </section>
    </div>
  );
}
