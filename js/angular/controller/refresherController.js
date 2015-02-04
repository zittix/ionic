IonicModule
.controller('$ionicRefresher', [
  '$scope',
  '$attrs',
  '$element',
  '$ionicBind',
  '$timeout',
  function($scope, $attrs,  $element, $ionicBind, $timeout) {
    var self = this,
        isDragging = false,
        isOverscrolling = false,
        dragOffset = 0,
        lastOverscroll = 0,
        ptrThreshold = 60,
        activated = false,
        scrollTime = 500,
        startY = null,
        deltaY = null,
        prefix = ionic.Platform.isAndroid() || ionic.Platform.isIOS() ? '-webkit-' : '';

    self.scrollParent = self.scrollChild = null;

    if (!isDefined($attrs.pullingIcon)) {
      $attrs.$set('pullingIcon', 'ion-android-arrow-down');
    }
    $scope.showSpinner = !isDefined($attrs.refreshingIcon);

    $ionicBind($scope, $attrs, {
      pullingIcon: '@',
      pullingText: '@',
      refreshingIcon: '@',
      refreshingText: '@',
      spinner: '@',
      disablePullingRotation: '@',
      $onRefresh: '&onRefresh',
      $onPulling: '&onPulling'
    });

    if (isDefined($attrs.onPullProgress)) {
      var onPullProgressFn = $parse($attrs.onPullProgress);
      $scope.$onPullProgress = function(progress) {
        onPullProgressFn($scope, {
          progress: progress
        });
      };
    }

    function handleDragEnd() {
      startY = null;
      if (!isDragging) {
        dragOffset = 0;
        lastOverscroll = 0;
        isOverscrolling = false;
        setScrollLock(false);
        return true;
      }
      isDragging = false;
      dragOffset = 0;

      if (lastOverscroll > ptrThreshold) {
        start();
        scrollTo(ptrThreshold, scrollTime);

      } else {
        scrollTo(0, scrollTime, deactivate);
        isOverscrolling = false;
      }
      return true;
    }

    function handleDrag(e) {
      if (e.touches.length > 1)return; //multi-touch gesture
      if (startY === null) startY = parseInt(e.touches[0].screenY, 10);
      deltaY = parseInt(e.touches[0].screenY, 10) - startY;

      if (deltaY - dragOffset <= 0 || self.scrollParent.scrollTop !== 0) {
        if (isOverscrolling) {
          isOverscrolling = false;
          setScrollLock(false);
        }
        if (isDragging) nativescroll(self.scrollParent,parseInt(deltaY - dragOffset, 10) * -1);
        // this only needs to happen once and a DOM read is cheaper than a write
        if (self.scrollChild.style[prefix + 'transform'] !== 'translateY(0px)') {
          overscroll(0);
        }
        return true;
      }else if (deltaY > 0 && self.scrollParent.scrollTop === 0 && !isOverscrolling) {
        // starting overscroll, but drag started below scrollTop 0, so we need to offset the position
        dragOffset = deltaY;
      }
      e.preventDefault();
      if (!isOverscrolling) {
        isOverscrolling = true;
        setScrollLock(true);
      }

      isDragging = true;
      overscroll(parseInt(deltaY - dragOffset, 10));
      lastOverscroll = parseInt(deltaY - dragOffset, 10);

      if (!activated && lastOverscroll > ptrThreshold) {
        activated = true;
        ionic.requestAnimationFrame(activate);

      } else if (activated && lastOverscroll < ptrThreshold) {
        activated = false;
        ionic.requestAnimationFrame(deactivate);
      }
    }

    function overscroll(val) {
      self.scrollChild.style[prefix + 'transform'] = 'translateY(' + val + 'px)';
    }

    function nativescroll(target, newScrollTop) {
      target.scrollTop = newScrollTop;
      var e = document.createEvent("UIEvents");
      // creates a scroll event that bubbles, can be cancelled, and with its view
      // and detail property initialized to window and 1, respectively
      e.initUIEvent("scroll", true, true, window, 1);
      target.dispatchEvent(e);
    }

    function setScrollLock(enabled) {
      if (enabled) {
        ionic.requestAnimationFrame(function() {
          self.scrollChild.classList.add('overscroll');
          show();
        });
      } else {
        ionic.requestAnimationFrame(function() {
          self.scrollChild.classList.remove('overscroll');
          hide();
        });
      }
    }

    $scope.$on('scroll.refreshComplete', function() {
      // prevent the complete from firing before the scroll has started
      $timeout(function() {
        ionic.requestAnimationFrame(tail);
        // scroll back to home during tail animation
        scrollTo(0, scrollTime, deactivate);
        // return to native scrolling after tail animation has time to finish
        $timeout(function() {
          if (isOverscrolling) {
            isOverscrolling = false;
            setScrollLock(false);
          }
          lastOverscroll = 0;
        }, scrollTime);
      }, scrollTime);
    });

    function scrollTo(Y, duration, callback) {
      // credit https://gist.github.com/dezinezync/5487119
      var start = Date.now(),
        from = lastOverscroll;

      if (from === Y) {
        callback();
        return; /* Prevent scrolling to the Y point if already there */
      }

      function min(a, b) {
        return a < b ? a : b;
      }

      // decelerating to zero velocity
      function easeOutCubic(t) {
        return (--t) * t * t + 1;
      }

      function scroll() {
        var currentTime = Date.now(),
          time = min(1, ((currentTime - start) / duration)),
          // where .5 would be 50% of time on a linear scale easedT gives a fraction based on the easing method
          easedT = easeOutCubic(time);

        overscroll(parseInt((easedT * (Y - from)) + from, 10));
        if (time < 1) {
          ionic.requestAnimationFrame(scroll);

        } else {
          lastOverscroll = Y;

          if (Y < 5 && Y > -5) {
            isOverscrolling = false;
            setScrollLock(false);
          }

          callback && callback();
        }
      }

      ionic.requestAnimationFrame(scroll);
    }


    self.init = function() {
      self.scrollParent = $element.parent().parent()[0];
      self.scrollChild = $element.parent()[0];
      if (!self.scrollParent.classList.contains('ionic-scroll') ||
          !self.scrollChild.classList.contains('scroll')) {
        throw new Error('Refresher must be immediate child of ion-content or ion-scroll');
      }
      ionic.on('touchmove', handleDrag, self.scrollChild);
      ionic.on('touchend', handleDragEnd, self.scrollChild);
    };

    // DOM manipulation and broadcast methods shared by JS and Native Scrolling
    // getter used by JS Scrolling
    self.getRefresherDomMethods = function() {
      return {
        activate: activate,
        deactivate: deactivate,
        start: start,
        show: show,
        hide: hide,
        tail: tail,
        onPullProgress: onPullProgress
      };
    };

    function activate() {
      $element[0].classList.add('active');
      $scope.$onPulling();
      onPullProgress(1);
    }

    function deactivate() {
      // give tail 150ms to finish
      $timeout(function() {
        // deactivateCallback
        $element.removeClass('active refreshing refreshing-tail');
        if (activated) activated = false;
      }, 150);
    }

    function start() {
      // startCallback
      $element[0].classList.add('refreshing');
      $scope.$onRefresh();
    }

    function show() {
      // showCallback
      $element[0].classList.remove('invisible');
    }

    function  hide() {
      // showCallback
      $element[0].classList.add('invisible');
    }

    function tail() {
      // tailCallback
      $element[0].classList.add('refreshing-tail');
    }

    function onPullProgress(progress) {
      $scope.$broadcast('$ionicRefresher.pullProgress', progress);
      $scope.$onPullProgress && $scope.$onPullProgress(progress);
    }

    // testing
    self.__drag = handleDrag;
  }
]);
