import { createRoot } from "react-dom/client";
import OpsExperience from "../src/components/site/OpsExperience";
import { ThemeProvider } from "../src/components/site/theme";
import "../src/styles/globals.css";
import "./preview.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <header className="preview-context">
      <a href="https://github.com/KIM3310/twincity-ui">TwinCity / Source</a>
      <p>체험 데이터 · 실제 관제 데이터에 연결되어 있지 않습니다. 이벤트를 선택하고 처리 상태와 지도를 바꿔보세요.</p>
      <a href="https://github.com/KIM3310/twincity-ui/blob/main/docs/VERIFICATION.md">검증 범위</a>
    </header>
    <main><OpsExperience /></main>
  </ThemeProvider>
);
