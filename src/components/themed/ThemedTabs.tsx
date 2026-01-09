import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import { useThemeStyles } from '@/lib/themeStyles';

const ThemedTabs = TabsPrimitive.Root;

const ThemedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const themeStyles = useThemeStyles();
  
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md p-1",
        themeStyles.tabsBg,
        'border',
        themeStyles.cardBorder,
        className,
      )}
      {...props}
    />
  );
});
ThemedTabsList.displayName = "ThemedTabsList";

const ThemedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const themeStyles = useThemeStyles();
  
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium",
        "ring-offset-background transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        themeStyles.accentColor,
        `data-[state=active]:${themeStyles.tabsActiveBg}`,
        `data-[state=active]:${themeStyles.tabsActiveText}`,
        "data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
});
ThemedTabsTrigger.displayName = "ThemedTabsTrigger";

const ThemedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
ThemedTabsContent.displayName = "ThemedTabsContent";

export { ThemedTabs, ThemedTabsList, ThemedTabsTrigger, ThemedTabsContent };