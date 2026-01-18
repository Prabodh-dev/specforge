import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const userStoriesSchema = z.object({
  epics: z.array(z.string()).default([]),
  stories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      asA: z.string(),
      iWant: z.string(),
      soThat: z.string(),
      acceptanceCriteria: z.array(z.string()),
    })
  ),
});

export const dbSchemaSchema = z.object({
  tables: z.array(
    z.object({
      name: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          nullable: z.boolean().default(false),
          primary: z.boolean().default(false),
          unique: z.boolean().default(false),
          references: z
            .object({ table: z.string(), column: z.string() })
            .optional(),
        })
      ),
      indexes: z.array(z.string()).optional(),
    })
  ),
});

export const tasksSchema = z.object({
  phases: z.array(
    z.object({
      name: z.string(),
      tasks: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          estimateHours: z.number().optional(),
        })
      ),
    })
  ),
});

export const jsonSchemas = {
  USER_STORIES: zodToJsonSchema(userStoriesSchema),
  DB_SCHEMA: zodToJsonSchema(dbSchemaSchema),
  TASKS: zodToJsonSchema(tasksSchema),
};
