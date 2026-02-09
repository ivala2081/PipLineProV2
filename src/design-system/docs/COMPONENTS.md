# Component API Reference

All components are exported from `@ds` or `@ds/components`.

## Core Components

### Typography
Text rendering with size, weight, and alignment variants.

```tsx
import { Typography } from '@ds'

<Typography size={24} semibold>Heading</Typography>
<Typography size={14} className="text-black/60">Body text</Typography>
```

**Props:** `size` (12-64), `semibold`, `align` (left|center|right), `italic`, `underline`, `as` (polymorphic)

### Button
Four variants matching SnowUI spec.

```tsx
import { Button } from '@ds'

<Button variant="filled" size="md" label="Submit" />
<Button variant="outline" size="sm" leftContent={<Icon />}>Click</Button>
<Button variant="gray" size="lg" />
<Button variant="borderless" />
```

**Variants:** `borderless` (default), `gray`, `outline`, `filled`
**Sizes:** `sm` (default), `md`, `lg`
**Props:** `label`, `leftContent`, `rightContent`, `textSize`, `as` (polymorphic)

### Input
Text input with floating label.

```tsx
import { Input } from '@ds'

<Input title="Email" placeholder="Enter email" />
<Input type="password" title="Password" />
```

### Card
Container with optional border.

```tsx
import { Card } from '@ds'

<Card>Content</Card>
<Card bordered>Bordered card</Card>
```

### Badge
Notification badge overlay.

```tsx
import { Badge } from '@ds'

<Badge content="3"><Avatar /></Badge>
```

### Tag
Colored labels for categories/status.

```tsx
import { Tag } from '@ds'

<Tag variant="green">Active</Tag>
<Tag variant="red">Error</Tag>
<Tag variant="blue">Info</Tag>
```

**Variants:** `default`, `purple`, `blue`, `green`, `red`, `yellow`, `orange`, `indigo`, `cyan`, `mint`

### Avatar
User avatar with image and fallback.

```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@ds'

<Avatar>
  <AvatarImage src="/avatar.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Separator
Horizontal or vertical divider.

```tsx
import { Separator } from '@ds'

<Separator />
<Separator orientation="vertical" />
```

### Skeleton
Loading placeholder.

```tsx
import { Skeleton } from '@ds'

<Skeleton className="h-4 w-[250px]" />
```

### Label
Form label (Radix UI).

### Link
Styled anchor element.

---

## Complex Components

### Table

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@ds'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>John</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Tabs

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ds'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Dialog

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@ds'

<Dialog>
  <DialogTrigger asChild><Button label="Open" /></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
    <p>Content here</p>
  </DialogContent>
</Dialog>
```

### DropdownMenu

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ds'

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button label="Options" /></DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Sidebar
Full sidebar system with collapsible states.

```tsx
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset } from '@ds'

<SidebarProvider>
  <Sidebar>
    <SidebarHeader>Logo</SidebarHeader>
    <SidebarContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>Dashboard</SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>Main content</SidebarInset>
</SidebarProvider>
```

### Accordion, Breadcrumb, Pagination, Popover, Sheet, Toaster, Tooltip, Form, Calendar

All follow Radix UI patterns. See individual component files for full props.
