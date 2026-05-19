import { useTranslation } from "react-i18next";

const LANGUAGE_OPTIONS = [
  { value: "en", labelKey: "language.english" },
  { value: "ko", labelKey: "language.korean" },
  { value: "my", labelKey: "language.myanmar" },
  { value: "zh-CN", labelKey: "language.chineseSimplified" },
] as const;

function resolveSelectedLanguage(language?: string) {
  if (!language) return "en";
  if (language === "zh-CN" || language.startsWith("zh")) return "zh-CN";
  if (language.startsWith("ko")) return "ko";
  if (language.startsWith("my")) return "my";
  return "en";
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <label className="topbarLanguageSwitcher">
      <span className="srOnly">{t("language.switchLanguage")}</span>
      <select
        className="topbarLanguageSelect"
        aria-label={t("language.switchLanguage")}
        value={resolveSelectedLanguage(i18n.resolvedLanguage ?? i18n.language)}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value);
        }}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
