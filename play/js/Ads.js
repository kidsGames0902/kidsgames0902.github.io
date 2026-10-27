// Ads.js
// Everything about ads lives here, so the rest of the game just calls:
//   Ads.showRewarded(onReward, onSkip)   - player chose to watch an ad for a bonus
//   Ads.levelCompleted(levelId)          - tell us a level was won
//   Ads.maybeShowInterstitial(onDone)    - maybe show an ad between levels
//
// Inside the real app, window.NativeAds (from src/ads-native.js) shows real AdMob ads.
// In a normal browser there is no NativeAds, so we show a pretend "mock" ad instead.

const AD_RULES = {
  firstInterstitialAfterLevel: 3,     // no ads between levels until level 3 is finished
  levelsBetweenInterstitials: 3,      // then at most one ad every 3 won levels...
  minSecondsBetweenInterstitials: 120, // ...and at least 2 minutes apart
  quietSecondsAfterRewarded: 60       // no surprise ad right after a rewarded one
};

const Ads = {
  levelsSinceInterstitial: 0,
  highestLevelCompleted: 0,
  lastInterstitialTime: 0,
  lastRewardedTime: 0,
  isShowing: false,     // true while an ad is on screen (stops a double tap starting two ads)

  // True when real AdMob ads are ready (inside the app)
  isNative() {
    return typeof window.NativeAds !== 'undefined';
  },

  // True when running inside the Android/iOS app (even if ads failed to start)
  isApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  },

  // Pretend ads are only for testing on your own PC (opening index.html from a folder,
  // or adding ?mockads to the address). The online version on the website shows no ads.
  useMockAds() {
    return location.protocol === 'file:' || location.search.indexOf('mockads') !== -1;
  },

  // True when buttons should say "watch an ad" (on the website the bonus is simply free)
  hasAds() {
    return this.isNative() || this.useMockAds();
  },

  // A rewarded ad: onReward runs only if the player watched it to the end
  showRewarded(onReward, onSkip) {
    if (this.isShowing) return;
    this.isShowing = true;
    SoundManager.pause('ad');
    const finish = (rewarded) => {
      this.isShowing = false;
      SoundManager.resume('ad');
      this.lastRewardedTime = Date.now();
      if (rewarded) {
        onReward();
      } else if (onSkip) {
        onSkip();
      }
    };

    if (this.isNative()) {
      window.NativeAds.showRewarded().then(finish, () => finish(true));
    } else if (this.useMockAds()) {
      this.showMockAd('Rewarded ad', () => finish(true));
    } else {
      finish(true); // no ads available (website, or ads failed in the app): just give the reward
    }
  },

  levelCompleted(levelId) {
    this.levelsSinceInterstitial++;
    this.highestLevelCompleted = Math.max(this.highestLevelCompleted, levelId);
  },

  // Shows an ad between levels only when the rules above allow it, then calls onDone
  maybeShowInterstitial(onDone) {
    if (this.isShowing) return;
    const now = Date.now();
    const allowed =
      this.highestLevelCompleted >= AD_RULES.firstInterstitialAfterLevel &&
      this.levelsSinceInterstitial >= AD_RULES.levelsBetweenInterstitials &&
      now - this.lastInterstitialTime >= AD_RULES.minSecondsBetweenInterstitials * 1000 &&
      now - this.lastRewardedTime >= AD_RULES.quietSecondsAfterRewarded * 1000;

    if (!allowed || (!this.isNative() && !this.useMockAds())) {
      onDone();
      return;
    }

    this.levelsSinceInterstitial = 0;
    this.lastInterstitialTime = now;
    this.isShowing = true;
    SoundManager.pause('ad');
    const finish = () => {
      this.isShowing = false;
      SoundManager.resume('ad');
      onDone();
    };

    if (this.isNative()) {
      window.NativeAds.showInterstitial().then(finish, finish);
    } else {
      this.showMockAd('Ad break', finish);
    }
  },

  // A pretend ad for testing in the browser: a dark screen with a 3-second countdown
  showMockAd(label, onDone) {
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;' +
      'justify-content:center;gap:12px;background:rgba(0,30,60,0.92);color:#fff;' +
      'font-family:Fredoka,sans-serif;font-size:28px;';
    const counter = document.createElement('div');
    box.innerHTML = '<div style="font-size:64px">📺</div><div>' + label + ' (test)</div>';
    box.appendChild(counter);
    document.body.appendChild(box);

    let secondsLeft = 3;
    counter.textContent = secondsLeft + '...';
    const timer = setInterval(() => {
      secondsLeft--;
      counter.textContent = secondsLeft + '...';
      if (secondsLeft <= 0) {
        clearInterval(timer);
        box.remove();
        onDone();
      }
    }, 1000);
  }
};
