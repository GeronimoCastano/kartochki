# Карточки

Russian flashcards for everyday use. You get 304 cards in ten decks: countries and nationalities, colours, basic adjectives, food and drink, этот / тот, the future tense with быть, the café dialogue, cooking and shopping, clothes, and the spring reading.

Most of the grammar decks come from lesson 14 («В кафе») of *Русский язык как иностранный, часть 1* (MPGU, 2018). The nationalities, colours, adjectives and most of the food deck go beyond the book. To add a deck, append it to `data.js`.

Open it here: **https://geronimocastano.github.io/kartochki/**

## What a card shows

- The Russian word with the Latin letters stacked under each Cyrillic letter (п → p, а → a). An acute accent marks the stressed vowel, as the book prints it, and the Latin line carries the same accent.
- The English meaning.
- A grammar note: part of speech, gender, plural, conjugation, or the case a word takes.
- An example sentence from the book where it has one.
- A speaker button that reads the word or the example aloud with your phone's Russian voice. Tap it a second time for a slower take. For a clearer voice on iPhone, download an enhanced Russian voice under Settings → Accessibility → Spoken Content → Voices → Russian.

## How to study

Pick a deck. Tap the card to flip it, then press **Got it** or **Again**. "Again" sends the card back a few places in the queue. Swipe left for the next card and right for the previous one.

Settings live on the home screen and on the chips above each card:

- **Ask in** Russian, English, or a mix of both.
- **Shuffle** on or off.
- **Latin** under the Russian on the question side, for when you still read Cyrillic slowly.

## Put it on your iPhone

Open the link in Safari, tap Share, then **Add to Home Screen**. It opens full screen and works offline after the first visit.

## Run it locally

No build step. Serve the folder:

```bash
python3 -m http.server 4517
```

The vocabulary lives in `data.js`. A backtick after a vowel marks stress (`кита`ец`), and `ё` counts as stressed on its own.
