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

