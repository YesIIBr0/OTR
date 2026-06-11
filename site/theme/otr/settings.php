<?php
// This file is part of the OTR theme for Moodle — theme_otr.
// GPL v3 or later — http://www.gnu.org/copyleft/gpl.html

/**
 * Admin settings for theme_otr. Adds an "OTR" category under
 * Site administration › Appearance › Themes with a preset picker
 * and three brand-colour overrides that feed the pre-SCSS callback.
 *
 * @package   theme_otr
 * @copyright 2026 OTR Debate Academy
 */

defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {
    $settings = new theme_boost_admin_settingspage_tabs('themesettingotr', get_string('configtitle', 'theme_otr'));

    // ---- Tab 1: General ----
    $page = new admin_settingpage('theme_otr_general', get_string('generalsettings', 'theme_otr'));

    // Preset selector (Boost default / plain / uploaded).
    $name = 'theme_otr/preset';
    $title = get_string('preset', 'theme_otr');
    $desc = get_string('preset_desc', 'theme_otr');
    $default = 'default.scss';
    $choices = ['default.scss' => 'default.scss', 'plain.scss' => 'plain.scss'];
    $setting = new admin_setting_configthemepreset($name, $title, $desc, $default, $choices, 'otr');
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);

    // Brand colours — each maps to a Bootstrap var in theme_otr_get_pre_scss().
    $colours = [
        'brandprimary'   => ['Primary (acción)', '#2E8BD0'],
        'brandsecondary' => ['Secondary (autoridad)', '#0C2340'],
        'brandaccent'    => ['Accent (sky)', '#4FA9E8'],
    ];
    foreach ($colours as $key => [$label, $def]) {
        $setting = new admin_setting_configcolourpicker("theme_otr/{$key}", $label, '', $def);
        $setting->set_updatedcallback('theme_reset_all_caches');
        $page->add($setting);
    }

    $settings->add($page);

    // ---- Tab 2: Advanced (raw SCSS) ----
    $page = new admin_settingpage('theme_otr_advanced', get_string('advancedsettings', 'theme_otr'));
    $setting = new admin_setting_scsscode('theme_otr/scss', get_string('rawscss', 'theme_otr'),
        get_string('rawscss_desc', 'theme_otr'), '', PARAM_RAW);
    $setting->set_updatedcallback('theme_reset_all_caches');
    $page->add($setting);
    $settings->add($page);
}
