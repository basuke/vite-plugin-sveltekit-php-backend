<?php

require $_SERVER['DOCUMENT_ROOT'] . "/vendor/autoload.php";

// import { fail } from '@sveltejs/kit';
// import { Game } from './game';
use App\Game;

function load() {
	$game = new Game($_COOKIE['sverdle'] ?? null);

	return [
		/**
		 * The player's guessed words so far
		 */
		'guesses' => $game->guesses,

		/**
		 * An array of strings like '__x_c' corresponding to the guesses, where 'x' means
		 * an exact match, and 'c' means a close match (right letter, wrong place)
		 */
		'answers' => $game->answers,

		/**
		 * The correct answer, revealed if the game is over
		 */
		'answer' => count($game->answers) >= 6 ? $game->answer : null
	];
}

$actions = [
	/**
	 * Modify game state in reaction to a keypress. If client-side JavaScript
	 * is available, this will happen in the browser instead of here
	 */
	'update' => function ($event) {
		$game = new Game($_COOKIE['sverdle']);

		$key = $_POST['key'];

		$i = count($game->answers);

		if ($key === 'backspace') {
			if ($game->guesses[$i] !== '') {
				$game->guesses[$i] = substr($game->guesses[$i], 0, strlen($game->guesses[$i]) - 1);
			}
		} else {
			$game->guesses[$i] .= $key;
		}

		setcookie('sverdle', strval($game));
	},

	/**
	 * Modify game state in reaction to a guessed word. This logic always runs on
	 * the server, so that people can't cheat by peeking at the JavaScript
	 */
	'enter' => function ($event) {
		$game = new Game($_COOKIE['sverdle']);

		/** @var object $_POST */
		$guess = $_POST->getAll('guess');

		if (!$game->enter($guess)) {
			return fail(400, ['badGuess' => true ]);
		}

		setcookie('sverdle', strval($game));
	},

	'restart' => function ($event) {
		setcookie('sverdle', '');
	},
];
