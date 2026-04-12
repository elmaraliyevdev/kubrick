import { cn } from "@/lib/utils";
import { legacyDescriptionToHtml, sanitizeJobDescriptionHtml } from "@/utils/jobDescriptionHtml";

interface JobDescriptionHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders stored job description HTML safely (rich text from TipTap).
 */
export function JobDescriptionHtml({ html, className }: JobDescriptionHtmlProps) {
  const raw = (html ?? "").trim();
  const normalized = /<[a-z][\s\S]*>/i.test(raw) ? raw : legacyDescriptionToHtml(raw);
  const safe = sanitizeJobDescriptionHtml(normalized);
  return (
    <div
      className={cn(
        "job-description-prose text-[15px] leading-relaxed text-muted-foreground",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground",
        "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_p]:mb-3 [&_p:last-child]:mb-0",
        "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic",
        "[&_hr]:my-6 [&_hr]:border-border",
        "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
        "[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[13px]",
        className,
      )}
      // safe is from DOMPurify
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
