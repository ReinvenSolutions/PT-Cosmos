CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"duration" integer NOT NULL,
	"nights" integer NOT NULL,
	"description" text,
	"image_url" text,
	"base_price" numeric(10, 2),
	"category" text DEFAULT 'internacional',
	"is_promotion" boolean DEFAULT false,
	"display_order" integer DEFAULT 999,
	"is_active" boolean DEFAULT true,
	"requires_tuesday" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" varchar NOT NULL,
	"item" text NOT NULL,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" varchar NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"location" text,
	"image_url" text,
	"nights" integer
);
--> statement-breakpoint
CREATE TABLE "inclusions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" varchar NOT NULL,
	"item" text NOT NULL,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "itinerary_days" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"destination_id" varchar NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"description" text NOT NULL,
	"activities" text[],
	"meals" text[],
	"accommodation" text
);
--> statement-breakpoint
CREATE TABLE "quote_destinations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" varchar NOT NULL,
	"destination_id" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"passengers" integer DEFAULT 2 NOT NULL,
	"price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"origin_city" text,
	"flights_and_extras" numeric(10, 2),
	"outbound_flight_images" text[],
	"return_flight_images" text[],
	"include_flights" boolean DEFAULT false,
	"outbound_cabin_baggage" boolean DEFAULT false,
	"outbound_hold_baggage" boolean DEFAULT false,
	"return_cabin_baggage" boolean DEFAULT false,
	"return_hold_baggage" boolean DEFAULT false,
	"turkey_upgrade" text,
	"trm" numeric(10, 2),
	"custom_filename" text,
	"min_payment" numeric(10, 2),
	"min_payment_cop" numeric(15, 2),
	"final_price" numeric(10, 2),
	"final_price_cop" numeric(15, 2),
	"final_price_currency" text DEFAULT 'USD',
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"username" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inclusions" ADD CONSTRAINT "inclusions_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_destinations" ADD CONSTRAINT "quote_destinations_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_destinations" ADD CONSTRAINT "quote_destinations_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_name_country_unique" ON "destinations" USING btree ("name","country");