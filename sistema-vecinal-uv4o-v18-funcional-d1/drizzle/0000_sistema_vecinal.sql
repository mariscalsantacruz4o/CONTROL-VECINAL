PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `neighbors` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text NOT NULL,
  `token` text NOT NULL,
  `name` text NOT NULL,
  `street` text NOT NULL,
  `lot` text NOT NULL,
  `phone` text DEFAULT '' NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_neighbors_code` ON `neighbors` (`code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_neighbors_token` ON `neighbors` (`token`);
--> statement-breakpoint
CREATE INDEX `idx_neighbors_active_name` ON `neighbors` (`active`,`name`);
--> statement-breakpoint
CREATE TABLE `activities` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `code` text NOT NULL,
  `type` text NOT NULL,
  `title` text NOT NULL,
  `date` text NOT NULL,
  `amount_cents` integer DEFAULT 0 NOT NULL,
  `status` text DEFAULT 'Programada' NOT NULL,
  `card_row_index` integer NOT NULL,
  `card_slot_index` integer NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activities_code` ON `activities` (`code`);
--> statement-breakpoint
CREATE INDEX `idx_activities_date` ON `activities` (`date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activities_card_position` ON `activities` (`card_row_index`,`card_slot_index`);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `activity_id` integer NOT NULL,
  `neighbor_id` integer NOT NULL,
  `status` text NOT NULL,
  `charge_cents` integer DEFAULT 0 NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`neighbor_id`) REFERENCES `neighbors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_activity_neighbor` ON `attendance_records` (`activity_id`,`neighbor_id`);
--> statement-breakpoint
CREATE INDEX `idx_attendance_neighbor` ON `attendance_records` (`neighbor_id`);
--> statement-breakpoint
CREATE TABLE `payments` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `neighbor_id` integer NOT NULL,
  `date` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `note` text DEFAULT '' NOT NULL,
  `receipt` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`neighbor_id`) REFERENCES `neighbors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_receipt` ON `payments` (`receipt`);
--> statement-breakpoint
CREATE INDEX `idx_payments_neighbor_date` ON `payments` (`neighbor_id`,`date`);
--> statement-breakpoint
CREATE TABLE `notices` (
  `id` integer PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `body` text DEFAULT '' NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `image_url` text DEFAULT '' NOT NULL,
  `event_type` text NOT NULL,
  `event_date` text NOT NULL,
  `event_time` text NOT NULL,
  `event_place` text NOT NULL,
  `whatsapp` text DEFAULT '' NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
  `id` integer PRIMARY KEY NOT NULL,
  `management_year` text NOT NULL,
  `theme_json` text DEFAULT '{}' NOT NULL,
  `labels_json` text DEFAULT '{}' NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `action` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `actor_email` text DEFAULT '' NOT NULL,
  `detail_json` text DEFAULT '{}' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_created_at` ON `audit_log` (`created_at`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
PRAGMA optimize;
