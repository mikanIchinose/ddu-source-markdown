import {
  BaseSource,
  Context,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.0.0/types.ts";
import {
  Denops,
  equal,
  fn,
} from "https://deno.land/x/ddu_vim@v.1.13.0/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.3.1/file.ts";
import { parse } from "https://deno.land/std@0.166.0/path/mod.ts";
import {
  MarkdownRecord,
  toRecords,
} from "https://deno.land/x/markdown_records@0.2.0/mod.ts";

type Params = {
  style: "none" | "parent" | "sharp";
  chunkSize: number;
  limit: number;
};

type Args = {
  denops: Denops;
  context: Context;
  sourceOptions: SourceOptions;
  sourceParams: Params;
};

export class Source extends BaseSource<Params> {
  kind = "file";

  gather(
    { denops, context, sourceOptions, sourceParams }: Args,
  ): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const bufNr = context.bufNr;
        const filePath = await fn.bufname(denops, bufNr);

        // Skip not markdown
        if (!parse(filePath).ext.includes("md")) return;

        const lines = await fn.getbufline(denops, bufNr, 1, "$");

        // Parse mardown
        const headerRecords = (await toRecords([...lines].join("\n")))
          .filter((line) => line.kind === "heading");

        let items: Item<ActionData>[] = [];
        const chunkSize = 5;
        for (let i = 0; i < lines.length; i++) {
          if (i >= sourceParams.limit) break;

          // Find header
          const header = headerRecords.find((record) => {
            return escapeRegex(lines[i]).includes(record.content);
          });
          if (!header) {
            continue;
          }
          const path = header.hierarchy.join("/") + "/";
          if (
            sourceOptions.path.length != 0 && path != sourceOptions.path + "/"
          ) {
            continue;
          }

          const isTree = headerRecords.find((record) => {
            return equal(
              header.hierarchy.concat([header.content]),
              record.hierarchy,
            );
          }) != undefined;

          // Create chunk
          const chunk: Item<ActionData> = {
            word: getStyledWord(header, sourceParams.style, isTree),
            action: {
              bufNr,
              lineNr: i + 1,
            },
            treePath: (header.hierarchy.length == 0)
              ? header.content
              : path + header.content,
            level: header.hierarchy.length,
            isExpanded: sourceOptions.path.length == 0,
            isTree,
          };
          items.push(chunk);

          if (items.length >= chunkSize) {
            controller.enqueue(items);
            items = [];
          }
        }
        if (items.length) {
          controller.enqueue(items);
        }

        controller.close();
      },
    });
  }

  params(): Params {
    return {
      style: "none",
      chunkSize: 5,
      limit: 1000,
    };
  }
}

const reRegExp = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExp = new RegExp(reRegExp.source);
const escapeRegex = (str: string): string => {
  return (str && reHasRegExp.test(str)) ? str.replace(reRegExp, "\\$&") : str;
};

const getStyledWord = (
  doc: MarkdownRecord,
  style: Params["style"],
  isParent: boolean,
): string => {
  const level = doc.hierarchy.length + 1;
  let word = doc.content;

  if (style === "parent") {
    doc.hierarchy.push(doc.content);
    word = doc.hierarchy.join("/");
  } else if (style === "sharp") {
    word = `${"#".repeat(level)} ${doc.content}`;
  }

  if (isParent) {
    word = word + "/";
  }

  return word;
};
