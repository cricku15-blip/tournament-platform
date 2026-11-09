import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  // Provide English messages by default; Hindi support can be plugged in here
  const locale = "en";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
