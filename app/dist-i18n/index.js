"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MESSAGES = void 0;
const messages_en_1 = require("./messages.en");
const messages_ar_1 = require("./messages.ar");
const messages_fr_1 = require("./messages.fr");
const messages_es_1 = require("./messages.es");
__exportStar(require("./catalogue"), exports);
/**
 * Every catalogue, keyed by locale code. English is the source: the other three
 * are checked against it for key parity by `preview/i18n-check.mjs`, which also
 * asserts that rendering the English entries reproduces the engine's own prose.
 *
 * To add a language: write `messages.<code>.ts` as a copy of the English keys,
 * add it here, and add its LOCALES entry in catalogue.ts. Nothing else changes.
 */
exports.MESSAGES = { en: messages_en_1.EN, ar: messages_ar_1.AR, fr: messages_fr_1.FR, es: messages_es_1.ES };
