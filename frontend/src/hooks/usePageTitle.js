import { useEffect } from "react";
import { APP_TITLE_PREFIX } from "../config/appMeta";

export default function usePageTitle(pageTitle) {
  useEffect(() => {
    if (!pageTitle) {
      document.title = APP_TITLE_PREFIX;
      return;
    }
    document.title = `${APP_TITLE_PREFIX} — ${pageTitle}`;
  }, [pageTitle]);
}
