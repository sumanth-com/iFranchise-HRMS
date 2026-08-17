"use client";

import { useMemo, useState } from "react";

import { API_DOC_NAV, API_DOC_SECTIONS, type ApiDocSectionId } from "@/lib/public-api/docs";
import { cn } from "@/lib/utils";

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
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav className="overflow-y-auto rounded-xl border bg-card p-2 text-sm">
        {API_DOC_NAV.map((item) => (
          <div key={item.id} className="mb-1">
            {item.children ? (
              <>
                <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {item.title}
                </p>
                {item.children.map((child) => {
                  const label = API_DOC_SECTIONS.find((entry) => entry.id === child)?.title ?? child;
                  return (
                    <button
                      key={child}
                      type="button"
                      onClick={() => setSectionId(child)}
                      className={cn(
                        "block w-full rounded-md px-2 py-1.5 text-left",
                        sectionId === child
                          ? "bg-muted font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSectionId(item.id)}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left",
                  sectionId === item.id
                    ? "bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.title}
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="min-h-0 overflow-y-auto rounded-xl border bg-card p-4">
        <h3 className="text-base font-semibold">{section.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{withOrigin(section.intro)}</p>
        {section.body?.map((paragraph) => (
          <pre
            key={paragraph}
            className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs"
          >
            {withOrigin(paragraph)}
          </pre>
        ))}
        {section.endpoints?.map((endpoint) => (
          <article key={`${endpoint.method}-${endpoint.path}`} className="mt-5 border-t pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {endpoint.method}
              </span>
              <code className="text-sm">{endpoint.path}</code>
            </div>
            <p className="mt-2 text-sm">{endpoint.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Authentication: Bearer API key · Required scope:{" "}
              <code>{endpoint.scope}</code>
            </p>
            {endpoint.parameters?.length ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Parameters
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {endpoint.parameters.map((parameter) => (
                    <li key={parameter.name}>
                      <code className="text-xs">{parameter.name}</code>{" "}
                      <span className="text-muted-foreground">
                        ({parameter.in}
                        {parameter.required ? ", required" : ""}) — {parameter.description}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {endpoint.requestExample ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Request example
                </p>
                <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs">
                  {withOrigin(endpoint.requestExample)}
                </pre>
              </div>
            ) : null}
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Response example
              </p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/50 p-3 font-mono text-xs">
                {endpoint.responseExample}
              </pre>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Errors
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {endpoint.errors.map((error) => (
                  <li key={`${error.status}-${error.code}`}>
                    <span className="font-medium">{error.status}</span> {error.code} — {error.meaning}
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
