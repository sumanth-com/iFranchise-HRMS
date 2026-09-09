"use client";

import { useMemo, useState } from "react";

import { API_DOC_NAV, API_DOC_SECTIONS, type ApiDocSectionId } from "@/lib/public-api/docs";
import { cn } from "@/lib/utils";

const ACTIVE =
  "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm font-semibold";

function looksLikeCode(value: string) {
  const trimmed = value.trimStart();
  return (
    trimmed.startsWith("{") ||
    trimmed.startsWith("curl") ||
    trimmed.startsWith("Authorization:") ||
    trimmed.startsWith("Accept:") ||
    trimmed.startsWith("Content-Type:") ||
    trimmed.startsWith("HTTP ") ||
    trimmed.startsWith("Response headers:") ||
    trimmed.includes("\n")
  );
}

export function ApiDocsPanel({ origin }: { origin: string }) {
  const [sectionId, setSectionId] = useState<ApiDocSectionId>("overview");
  const section = useMemo(
    () => API_DOC_SECTIONS.find((item) => item.id === sectionId) ?? API_DOC_SECTIONS[0],
    [sectionId],
  );

  function withOrigin(value: string) {
    return value.replaceAll("{origin}", origin);
  }

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <nav
        className="overflow-y-auto rounded-xl border bg-card p-2 text-sm shadow-sm"
        aria-label="API documentation"
      >
        {API_DOC_NAV.map((item) => (
          <div key={item.id} className="mb-1">
            {item.children ? (
              <>
                <p className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {item.title}
                </p>
                <div className="space-y-0.5">
                  {item.children.map((child) => {
                    const label =
                      API_DOC_SECTIONS.find((entry) => entry.id === child)?.title ?? child;
                    const isActive = sectionId === child;
                    return (
                      <button
                        key={child}
                        type="button"
                        onClick={() => setSectionId(child)}
                        className={cn(
                          "block w-full rounded-lg px-2.5 py-1.5 text-left transition-colors duration-150",
                          isActive
                            ? ACTIVE
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSectionId(item.id as ApiDocSectionId)}
                className={cn(
                  "block w-full rounded-lg px-2.5 py-1.5 text-left transition-colors duration-150",
                  sectionId === item.id
                    ? ACTIVE
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {item.title}
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="min-h-0 overflow-y-auto rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <h3 className="text-base font-semibold tracking-tight">{section.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {withOrigin(section.intro)}
        </p>

        {section.body?.map((paragraph) =>
          looksLikeCode(paragraph) ? (
            <pre
              key={paragraph}
              className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed"
            >
              {withOrigin(paragraph)}
            </pre>
          ) : (
            <p key={paragraph} className="mt-3 text-sm leading-relaxed text-foreground/90">
              {withOrigin(paragraph)}
            </p>
          ),
        )}

        {section.endpoints?.map((endpoint) => (
          <article
            key={`${endpoint.method}-${endpoint.path}`}
            className="mt-5 space-y-3 border-t pt-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                {endpoint.method}
              </span>
              <code className="text-sm font-semibold">{endpoint.path}</code>
            </div>
            <p className="text-sm leading-relaxed">{endpoint.description}</p>
            <p className="text-xs text-muted-foreground">
              Authentication: Bearer API key · Required scope:{" "}
              <code className="rounded bg-muted px-1 py-0.5">{endpoint.scope}</code>
            </p>

            {endpoint.parameters?.length ? (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Parameters
                </p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {endpoint.parameters.map((parameter) => (
                    <li key={parameter.name} className="flex flex-wrap gap-x-2">
                      <code className="text-xs font-semibold">{parameter.name}</code>
                      <span className="text-xs text-muted-foreground">
                        ({parameter.in}
                        {parameter.required ? ", required" : ""}) — {parameter.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {endpoint.requestExample ? (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Request example
                </p>
                <pre className="mt-1.5 overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                  {withOrigin(endpoint.requestExample)}
                </pre>
              </div>
            ) : null}

            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Response example
              </p>
              <pre className="mt-1.5 overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {endpoint.responseExample}
              </pre>
            </div>

            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Error responses
              </p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {endpoint.errors.map((error) => (
                  <li key={`${error.status}-${error.code}`}>
                    <span className="font-medium">{error.status}</span>{" "}
                    <code className="text-xs">{error.code}</code>
                    <span className="text-muted-foreground"> — {error.meaning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
