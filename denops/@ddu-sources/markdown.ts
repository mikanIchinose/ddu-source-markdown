import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v3.7.0/types.ts";
import { GatherArguments } from "https://deno.land/x/ddu_vim@v3.7.0/base/source.ts";
import { equal, fn } from "https://deno.land/x/ddu_vim@v3.7.0/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";
import { parse } from "https://deno.land/std@0.208.0/path/mod.ts";
import {
  MarkdownRecord,
  toRecords,
} from "https://deno.land/x/markdown_records@0.2.0/mod.ts";

type Params = {
  limit: number;
};

export class Source extends BaseSource<Params> {
  kind = "file";

  override gather({
    denops,
    context,
    sourceOptions,
    sourceParams,
  }: GatherArguments<Params>): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        const bufNr = context.bufNr;

        // Skip not markdown
        const filePath = await fn.bufname(denops, bufNr);
        if (!parse(filePath).ext.includes("md")) return;

        // バッファーのテキストを取得
        const lines = await fn.getbufline(denops, bufNr, 1, "$");

        // Parse mardown and filter header
        const headerRecords = (await toRecords([...lines].join("\n"))).filter(
          (line) => line.kind === "heading",
        );

        const items: Item<ActionData>[] = [];
        for (let i = 0; i < lines.length; i++) {
          if (i >= sourceParams.limit) break;

          // Find header
          const header = headerRecords.find((record) => {
            return lines[i].replace(/#* /, "") === record.content;
          });
          if (!header) continue;

          const path = header.hierarchy.join("/") + "/";
          if (
            sourceOptions.path.length !== 0 &&
            path !== sourceOptions.path + "/"
          ) {
            continue;
          }

          //const isTree = headerRecords.find((record) => {
          //  return equal(
          //    header.hierarchy.concat([header.content]),
          //    record.hierarchy,
          //  );
          //}) !== undefined;

          const item: Item<ActionData> = {
            word: getStyledWord(header),
            action: {
              bufNr,
              lineNr: i + 1,
            },
            //treePath: header.hierarchy.length === 0
            //  ? header.content
            //  : path + header.content,
            //level: header.hierarchy.length,
            //isTree: isTree,
          };
          items.push(item);
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
      limit: 1000,
    };
  }
}

const getStyledWord = (
  markdownRecord: MarkdownRecord,
): string => {
  const level = markdownRecord.hierarchy.length + 1;
  let word = markdownRecord.content;
  word = `${"#".repeat(level)} ${markdownRecord.content}`;

  return word;
};
