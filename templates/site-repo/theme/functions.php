<?php
/**
 * {{SITE_NAME}} theme bootstrap.
 *
 * @package {{SITE_ID}}
 */

declare(strict_types=1);

add_action(
	'after_setup_theme',
	static function (): void {
		add_theme_support( 'wp-block-styles' );
		add_editor_style( 'style.css' );
	}
);
