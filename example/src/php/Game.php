<?php

namespace App;

use App\Words;

class Game {
    public int $index;
    public array $guesses;
    public array $answers;
    public string $answer;

	/**
	 * Create a game object from the player's cookie, or initialise a new game
	 * @param {string | undefined} serialized
	 */
	public function __construct($serialized = null) {
        $words = Words::words();

		if ($serialized) {
			[$index, $guesses, $answers] = explode('-', $serialized);

			$this->index = intval($index);
			$this->guesses = $guesses ? explode(' ', $guesses) : [];
			$this->answers = $answers ? explode(' ', $answers) : [];
		} else {
			$this->index = rand(0, count($words) - 1);
			$this->guesses = ['', '', '', '', '', ''];
			$this->answers = [];
		}

		$this->answer = $words[$this->index];
	}

	/**
	 * Update game state based on a guess of a five-letter word. Returns
	 * true if the guess was valid, false otherwise
	 * @param {string[]} letters
	 */
	public function enter($letters) {
		$word = implode('', $letters);
		$valid = array_search($word, Words::allowed());

		if ($valid === false) return false;

		$this->guesses[count($this->answers)] = $word;

		$available = "" . $this->answer;
		$answer = str_repeat('_', 5);

		// first, find exact matches
		for ($i = 0; $i < 5; $i += 1) {
			if ($letters[$i] === $available[$i]) {
				$answer[$i] = 'x';
				$available[$i] = ' ';
			}
		}

		// then find close matches (this has to happen
		// in a second step, otherwise an early close
		// match can prevent a later exact match)
		for ($i = 0; $i < 5; $i += 1) {
			if ($answer[$i] === '_') {
				$index = strpos($available, $letters[$i]);
				if ($index !== false) {
					$answer[$i] = 'c';
					$available[$index] = ' ';
				}
			}
		}

		$this->answers[] = $answer;

		return true;
	}

	/**
	 * Serialize game state so it can be set as a cookie
	 */
    public function __toString()
    {
		return implode('-', [$this->index, implode(' ', $this->guesses), implode(' ', $this->answers)]);
	}
}
