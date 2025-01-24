CREATE TABLE IF NOT EXISTS "iot_device_user" (
	"device_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "iot_device_user_device_id_user_id_pk" PRIMARY KEY("device_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "iot_device" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"mac_address" varchar(255) NOT NULL,
	"secret_code" varchar(255) NOT NULL,
	"contrast" varchar(10) DEFAULT 'medium',
	"orientation" boolean DEFAULT false,
	"interval" integer DEFAULT 4000,
	"temp_threshold_high" numeric(4, 1) DEFAULT '23.0',
	"temp_threshold_low" numeric(4, 1) DEFAULT '19.0',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "iot_device_mac_address_unique" UNIQUE("mac_address")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iot_device_user" ADD CONSTRAINT "iot_device_user_device_id_iot_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_device"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iot_device_user" ADD CONSTRAINT "iot_device_user_user_id_iot_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."iot_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_user_device_id_idx" ON "iot_device_user" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "device_user_user_id_idx" ON "iot_device_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mac_address_idx" ON "iot_device" USING btree ("mac_address");