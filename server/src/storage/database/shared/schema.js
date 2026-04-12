import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { pgTable as pgTableCore, varchar, boolean, integer, index } from "drizzle-orm/pg-core";
export const healthCheck = pgTable("health_check", {
    id: serial().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});
// 用户表
export const users = pgTableCore("users", {
    id: varchar("id", { length: 36 }).primaryKey().default(sql `gen_random_uuid()`),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    password: varchar("password", { length: 128 }).notNull(),
    is_permanent_vip: boolean("is_permanent_vip").default(false).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
    index("users_phone_idx").on(table.phone),
    index("users_username_idx").on(table.username),
]);
// 免费码表
export const freeCodes = pgTableCore("free_codes", {
    id: varchar("id", { length: 36 }).primaryKey().default(sql `gen_random_uuid()`),
    code: varchar("code", { length: 20 }).notNull().unique(),
    duration_type: varchar("duration_type", { length: 20 }).notNull(),
    // duration_type: '1_month', '3_months', '6_months', '1_year'
    duration_days: integer("duration_days").notNull(),
    // duration_days: 30, 90, 180, 365
    is_used: boolean("is_used").default(false).notNull(),
    used_by: varchar("used_by", { length: 36 }),
    used_at: timestamp("used_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("free_codes_code_idx").on(table.code),
    index("free_codes_used_by_idx").on(table.used_by),
]);
// 验证码表
export const verificationCodes = pgTableCore("verification_codes", {
    id: varchar("id", { length: 36 }).primaryKey().default(sql `gen_random_uuid()`),
    phone: varchar("phone", { length: 20 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    purpose: varchar("purpose", { length: 20 }).notNull(),
    // purpose: 'register', 'login', 'free_code'
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    is_used: boolean("is_used").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("verification_codes_phone_idx").on(table.phone),
    index("verification_codes_code_idx").on(table.code),
]);
// 用户会员有效期表
export const userMemberships = pgTableCore("user_memberships", {
    id: varchar("id", { length: 36 }).primaryKey().default(sql `gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    membership_type: varchar("membership_type", { length: 20 }).notNull(),
    // membership_type: 'free_code', 'permanent'
    source: varchar("source", { length: 50 }),
    // source: 'free_code_1_month', 'free_code_3_months', 'free_code_6_months', 'free_code_1_year', 'permanent'
    start_date: timestamp("start_date", { withTimezone: true }).notNull(),
    end_date: timestamp("end_date", { withTimezone: true }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("user_memberships_user_id_idx").on(table.user_id),
    index("user_memberships_end_date_idx").on(table.end_date),
]);
