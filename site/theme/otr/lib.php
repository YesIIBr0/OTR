<?php
// This file is part of the OTR theme for Moodle — theme_otr.
// GPL v3 or later — http://www.gnu.org/copyleft/gpl.html

/**
 * SCSS callbacks for theme_otr.
 *
 * @package   theme_otr
 * @copyright 2026 OTR Debate Academy
 */

defined('MOODLE_INTERNAL') || die();

/**
 * Returns the main SCSS content: the chosen preset (Boost default by
 * default) is the base on top of which pre/extra SCSS are layered.
 *
 * @param theme_config $theme
 * @return string
 */
function theme_otr_get_main_scss_content($theme) {
    global $CFG;

    $scss = '';
    $filename = !empty($theme->settings->preset) ? $theme->settings->preset : 'default.scss';
    $fs = get_file_storage();
    $context = context_system::instance();

    // Allow an admin-uploaded preset; otherwise read Boost's default preset.
    if ($filename === 'default.scss') {
        $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/default.scss');
    } else if ($filename === 'plain.scss') {
        $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/plain.scss');
    } else if ($preset = $fs->get_file($context->id, 'theme_otr', 'preset', 0, '/', $filename)) {
        $scss .= $preset->get_content();
    } else {
        $scss .= file_get_contents($CFG->dirroot . '/theme/boost/scss/preset/default.scss');
    }

    return $scss;
}

/**
 * Injected BEFORE Bootstrap — this is where brand tokens become the
 * Bootstrap variables that Boost (and core) build everything from.
 *
 * @param theme_config $theme
 * @return string
 */
function theme_otr_get_pre_scss($theme) {
    global $CFG;

    $scss = '';

    // 1) Our brand tokens → Bootstrap variables.
    $scss .= file_get_contents(__DIR__ . '/scss/pre.scss');

    // 2) Map any admin colour settings on top (settings.php) so the
    //    Site administration › Appearance UI keeps working.
    $configurable = [
        'brandprimary'   => '$primary',
        'brandsecondary' => '$secondary',
        'brandaccent'    => '$otr-sky',
    ];
    foreach ($configurable as $setting => $target) {
        $value = isset($theme->settings->{$setting}) ? $theme->settings->{$setting} : null;
        if (!empty($value)) {
            $scss .= "\n{$target}: {$value};";
        }
    }

    return $scss;
}

/**
 * Injected AFTER Bootstrap + Boost — component-level overrides keyed to
 * real Moodle selectors (navbar, cards, gradebook, forum, badges…).
 *
 * @param theme_config $theme
 * @return string
 */
function theme_otr_get_extra_scss($theme) {
    $scss = file_get_contents(__DIR__ . '/scss/post.scss');

    // Respect Boost's own extra SCSS (custom SCSS textarea in settings).
    if (!empty($theme->settings->scss)) {
        $scss .= "\n" . $theme->settings->scss;
    }

    return $scss;
}
