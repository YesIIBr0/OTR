<?php
// This file is part of the OTR theme for Moodle — theme_otr.
// GPL v3 or later — http://www.gnu.org/copyleft/gpl.html

/**
 * Theme configuration. Declares OTR as a child of Boost and wires the
 * SCSS callbacks so brand tokens compile into the served stylesheet.
 *
 * @package   theme_otr
 * @copyright 2026 OTR Debate Academy
 */

defined('MOODLE_INTERNAL') || die();

$THEME->name = 'otr';

// Inherit every layout, block region and renderer from Boost.
$THEME->parents = ['boost'];

// We ship NO static CSS sheets — everything is SCSS compiled at runtime.
$THEME->sheets = [];
$THEME->editor_sheets = [];

// Use Boost's fallback while SCSS compiles (first request after purge).
$THEME->usefallback = true;

// Reuse Boost's block region layout and "flat navigation".
$THEME->addblockposition = BLOCK_ADDBLOCK_POSITION_FLATNAV;
$THEME->requiredblocks = '';

// Lets us override core/Boost renderers from theme/otr/classes/output/.
$THEME->rendererfactory = 'theme_overridden_renderer_factory';

// SCSS pipeline:
//  1) scss()            → the base preset (Boost default) + our maps.
//  2) prescsscallback   → variables injected BEFORE Bootstrap ($primary…).
//  3) extrascsscallback → component overrides injected AFTER Bootstrap.
$THEME->scss = function($theme) {
    return theme_otr_get_main_scss_content($theme);
};
$THEME->prescsscallback   = 'theme_otr_get_pre_scss';
$THEME->extrascsscallback = 'theme_otr_get_extra_scss';

// Inherit Boost's SVG icon system and layouts (drawers, login, etc.).
$THEME->iconsystem = \core\output\icon_system::FONTAWESOME;
$THEME->haseditswitch = true;

// We do not redefine layouts — Boost's layouts (incl. theme_boost/drawers
// and the login layout) are inherited unchanged. Override only via the
// templates/ folder when a specific Mustache needs brand markup.
$THEME->layouts = []; // empty = fall through to Boost.
