<?php
// This file is part of the OTR theme for Moodle — theme_otr.
//
// Child theme of Boost for OTR Debate Academy.
// GPL v3 or later — http://www.gnu.org/copyleft/gpl.html

/**
 * Plugin version and metadata.
 *
 * @package   theme_otr
 * @copyright 2026 OTR Debate Academy
 */

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'theme_otr';        // Full name of the plugin (used for diagnostics).
$plugin->version   = 2026060900;         // YYYYMMDDXX — bump on every change.
$plugin->requires  = 2023100900;         // Moodle 4.3.0 or later.
$plugin->maturity  = MATURITY_BETA;      // ALPHA / BETA / RC / STABLE.
$plugin->release   = '0.1.0';

// Boost MUST be present — we inherit all of its layouts and renderers.
$plugin->dependencies = [
    'theme_boost' => 2023100900,
];
