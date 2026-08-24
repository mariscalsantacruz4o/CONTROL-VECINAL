import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const neighbors = sqliteTable("neighbors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  token: text("token").notNull(),
  name: text("name").notNull(),
  street: text("street").notNull(),
  lot: text("lot").notNull(),
  phone: text("phone").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_neighbors_code").on(table.code),
  uniqueIndex("idx_neighbors_token").on(table.token),
  index("idx_neighbors_active_name").on(table.active, table.name),
]);

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  status: text("status", { enum: ["Programada", "Cerrada"] }).notNull().default("Programada"),
  cardRowIndex: integer("card_row_index").notNull(),
  cardSlotIndex: integer("card_slot_index").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_activities_code").on(table.code),
  index("idx_activities_date").on(table.date),
  uniqueIndex("idx_activities_card_position").on(table.cardRowIndex, table.cardSlotIndex),
]);

export const attendanceRecords = sqliteTable("attendance_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  activityId: integer("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }),
  neighborId: integer("neighbor_id").notNull().references(() => neighbors.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["Presente", "Faltó", "Justificado"] }).notNull(),
  chargeCents: integer("charge_cents").notNull().default(0),
  note: text("note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_attendance_activity_neighbor").on(table.activityId, table.neighborId),
  index("idx_attendance_neighbor").on(table.neighborId),
]);

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  neighborId: integer("neighbor_id").notNull().references(() => neighbors.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  amountCents: integer("amount_cents").notNull(),
  note: text("note").notNull().default(""),
  receipt: text("receipt").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_payments_receipt").on(table.receipt),
  index("idx_payments_neighbor_date").on(table.neighborId, table.date),
]);

export const notices = sqliteTable("notices", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  imageUrl: text("image_url").notNull().default(""),
  eventType: text("event_type").notNull(),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  eventPlace: text("event_place").notNull(),
  whatsapp: text("whatsapp").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const systemSettings = sqliteTable("system_settings", {
  id: integer("id").primaryKey(),
  managementYear: text("management_year").notNull(),
  themeJson: text("theme_json").notNull().default("{}"),
  labelsJson: text("labels_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  actorEmail: text("actor_email").notNull().default(""),
  detailJson: text("detail_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_audit_created_at").on(table.createdAt)]);
