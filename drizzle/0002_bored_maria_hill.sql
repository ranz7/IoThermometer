CREATE TABLE IF NOT EXISTS "iot_temperature" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"device_id" varchar(255) NOT NULL,
	"value" numeric(4, 1) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "iot_temperature" ADD CONSTRAINT "iot_temperature_device_id_iot_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."iot_device"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temperature_device_id_idx" ON "iot_temperature" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "temperature_timestamp_idx" ON "iot_temperature" USING btree ("timestamp");