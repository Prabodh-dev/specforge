export const TERMINOLOGY = {
  artifact: "Document",
  artifacts: "Documents",

  workflows: [
    {
      key: "GENERATE_PRD",
      label: "Create Product Description",
      icon: "📋",
      desc: "Write a complete product overview explaining what your product does, who it's for, and why it matters.",
    },
    {
      key: "GENERATE_USER_STORIES",
      label: "Create User Stories",
      icon: "👥",
      desc: "Break down your product into small, actionable tasks from the user's perspective (e.g., 'As a user, I want to...').",
    },
    {
      key: "GENERATE_API_SPEC",
      label: "Create API Specification",
      icon: "🔌",
      desc: "Define all the technical endpoints and data structures your API will expose for developers.",
    },
    {
      key: "GENERATE_DB_SCHEMA",
      label: "Create Database Schema",
      icon: "🗄️",
      desc: "Design the database tables, columns, and relationships your application needs.",
    },
    {
      key: "GENERATE_TASK_BREAKDOWN",
      label: "Create Task Breakdown",
      icon: "✅",
      desc: "Generate a detailed list of engineering tasks for your development team to build.",
    },
  ],

  exports: [
    {
      type: "PRD_MD",
      label: "📋 Product Description",
      desc: "Ready-to-share markdown document explaining your product",
    },
    {
      type: "API_SPEC_JSON",
      label: "🔌 API Specification",
      desc: "Technical spec that developers use to build against your API",
    },
    {
      type: "DB_SCHEMA_JSON",
      label: "🗄️ Database Schema",
      desc: "Database structure definition in JSON format",
    },
    {
      type: "SCAFFOLD_ZIP",
      label: "📦 Project Scaffold",
      desc: "Boilerplate code starter pack for your project",
    },
  ],

  reviewStatus: {
    PENDING: "Waiting for approval",
    APPROVED: "✓ Approved",
    REJECTED: "✗ Rejected",
  },

  exportStatus: {
    QUEUED: "Preparing...",
    PROCESSING: "In progress...",
    DONE: "Ready to download",
    FAILED: "Failed to generate",
  },
};

export function getWorkflowLabel(key: string): string {
  return TERMINOLOGY.workflows.find((w) => w.key === key)?.label || key;
}

export function getWorkflowDescription(key: string): string {
  return TERMINOLOGY.workflows.find((w) => w.key === key)?.desc || "";
}

export function getExportLabel(type: string): string {
  return TERMINOLOGY.exports.find((e) => e.type === type)?.label || type;
}

export function getExportDescription(type: string): string {
  return TERMINOLOGY.exports.find((e) => e.type === type)?.desc || "";
}

export function getReviewStatusLabel(status: string): string {
  return (
    TERMINOLOGY.reviewStatus[status as keyof typeof TERMINOLOGY.reviewStatus] ||
    status
  );
}

export function getExportStatusLabel(status: string): string {
  return (
    TERMINOLOGY.exportStatus[status as keyof typeof TERMINOLOGY.exportStatus] ||
    status
  );
}
