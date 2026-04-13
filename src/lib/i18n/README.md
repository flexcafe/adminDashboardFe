# Internationalization (i18n) Implementation

This document describes the internationalization setup for the WMS Frontend application, supporting English and Myanmar languages.

## Overview

The application uses `react-i18next` for internationalization with the following features:

- **Languages**: English (en) and Myanmar (my)
- **Auto-detection**: Browser language detection with localStorage persistence
- **Localized formatting**: Date, number, and currency formatting based on current locale
- **Language switcher**: UI component to switch between languages

## File Structure

```
src/lib/i18n/
├── index.ts              # i18n configuration and initialization
├── locales/
│   ├── en.json          # English translations
│   └── my.json          # Myanmar translations
├── formatters.ts        # Localized formatting utilities
└── README.md           # This documentation
```

## Configuration

The i18n system is configured in `src/lib/i18n/index.ts`:

- **Fallback language**: English (`en`)
- **Language detection**: Browser → localStorage → HTML tag
- **Storage**: Preferences saved in localStorage as `i18nextLng`

## Usage

### Using Translations in Components

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("customers.title")}</h1>
      <p>{t("customers.description")}</p>
    </div>
  );
}
```

### Using Localized Date Formatting

```tsx
import { useDateFormatter } from "@/lib/i18n/formatters";

function MyComponent() {
  const { formatDate } = useDateFormatter();

  return (
    <div>
      {formatDate(new Date())} {/* Automatically uses current locale */}
    </div>
  );
}
```

### Using Localized Number Formatting

```tsx
import { useNumberFormatter } from "@/lib/i18n/formatters";

function MyComponent() {
  const { formatCurrency } = useNumberFormatter();

  return (
    <div>
      {formatCurrency(1234.56, "USD")} {/* $1,234.56 or localized equivalent */}
    </div>
  );
}
```

## Translation Keys Structure

The translation files follow a nested structure:

```json
{
  "common": {
    "loading": "Loading...",
    "error": "Error",
    "success": "Success"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "customers": "Customers"
  },
  "customers": {
    "title": "Customer Management",
    "addCustomer": "Add Customer"
  }
}
```

Access nested keys using dot notation: `t('customers.title')`

## Language Switcher

The `LanguageSwitcher` component is available in the dashboard header and allows users to switch between English and Myanmar:

```tsx
import { LanguageSwitcher } from "@/components/ui/language-switcher";

// Used in DashboardLayout.tsx
<LanguageSwitcher />;
```

## Localization Features

### Date Formatting

- **English**: Uses `en-US` locale (e.g., "Jan 15, 2024")
- **Myanmar**: Uses `my-MM` locale with Myanmar calendar support

### Number Formatting

- **English**: Uses `en-US` locale (e.g., "1,234.56")
- **Myanmar**: Uses `my-MM` locale with Myanmar number formatting

### Currency Formatting

- Automatically adapts to the current locale
- Supports different currencies (USD, MMK, etc.)

## Adding New Languages

1. Create a new translation file in `src/lib/i18n/locales/` (e.g., `th.json`)
2. Add the language to the resources in `src/lib/i18n/index.ts`
3. Update the language options in `src/components/ui/language-switcher.tsx`
4. Add locale mapping in the formatter functions

## Adding New Translation Keys

1. Add the key to both `en.json` and `my.json`
2. Use descriptive, hierarchical keys (e.g., `module.feature.action`)
3. Keep translations consistent across all language files

## Best Practices

1. **Use semantic keys**: `t('customers.confirmDelete')` not `t('areYouSure')`
2. **Group related keys**: Use nested objects for organization
3. **Provide context**: Include context in key names when needed
4. **Test both languages**: Always verify translations in both languages
5. **Use formatters**: Use localized formatters for dates, numbers, and currency

## Current Implementation Status

✅ **Completed Features:**

- Basic i18n setup with English and Myanmar
- Language switcher component
- Customers page fully translated
- Navigation menu translated
- Localized date and number formatting
- CSV export localization support

📝 **Next Steps:**

- Translate remaining pages (Users, Suppliers, Orders, etc.)
- Add more granular date/time formatting options
- Implement RTL support if needed
- Add pluralization rules for Myanmar
- Consider adding more Southeast Asian languages

## Troubleshooting

### Common Issues:

1. **Missing translations**: Check if the key exists in both language files
2. **Formatting not working**: Ensure you're using the formatter hooks
3. **Language not switching**: Check localStorage and browser settings
4. **Build errors**: Verify all translation files have valid JSON syntax

### Debug Mode:

Enable debug mode in development by setting `debug: true` in the i18n configuration.

