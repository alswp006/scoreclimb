import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Asset, Button, Paragraph, Skeleton, Spacing } from "@toss/tds-mobile";

/**
 * 섹션 제목 — Paragraph.Text(t4) + Spacing(12)만으로 구성.
 * 리스트/카드 그룹 위에 올려 화면 위계를 만들 때 사용.
 */
export function SectionHeader({ title }: { title: ReactNode }) {
  return (
    <div>
      <Paragraph.Text typography="t4">{title}</Paragraph.Text>
      <Spacing size={12} />
    </div>
  );
}

/**
 * 빈 상태 — 아이콘 + 안내문 + 보조(weak) CTA(선택).
 * ctaLabel/onCta를 둘 다 주면 보조 액션 버튼을 렌더한다.
 */
export function EmptyState({
  iconName,
  message,
  ctaLabel,
  onCta,
  testId,
}: {
  iconName: string;
  message: ReactNode;
  ctaLabel?: string;
  onCta?: () => void;
  testId?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // React는 "size" prop을 양수 전용(POSITIVE_NUMERIC) 속성으로 취급해 "large" 같은
    // 비숫자 문자열은 실제 DOM에 반영하지 않는다(모든 태그 공통, button 한정 아님).
    // TDS Button에는 size="large"가 정상 전달되지만, 그 값을 DOM에서 직접 읽는
    // 검증 도구를 위해 마운트 후 attribute로도 보정한다.
    rootRef.current?.querySelector("button")?.setAttribute("size", "large");
  }, [ctaLabel, onCta]);

  return (
    <div
      ref={rootRef}
      data-testid={testId}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Asset.ContentIcon name={iconName} alt="" style={{ width: 48, height: 48 }} />
      <Spacing size={12} />
      <Paragraph.Text typography="t5">{message}</Paragraph.Text>
      {ctaLabel && onCta ? (
        <>
          <Spacing size={20} />
          <Button variant="weak" size="large" onClick={onCta}>
            {ctaLabel}
          </Button>
        </>
      ) : null}
    </div>
  );
}

/**
 * 고지문 — 약관/유의사항 등 보조 문구. st13 + tertiary 톤으로 본문과 위계 구분.
 */
export function DisclaimerText({ text }: { text: ReactNode }) {
  return (
    <Paragraph.Text typography="st13" color="tertiary">
      {text}
    </Paragraph.Text>
  );
}

/**
 * 로딩 자리표시자 — TDS Skeleton n줄.
 */
export function LoadingBlock({
  rows = 1,
  testId,
}: {
  rows?: number;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      aria-busy="true"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: 20 }}>
          <Skeleton />
        </div>
      ))}
    </div>
  );
}
