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
        scrollTime = 500;

    self.scrollParent = self.scrollChild = null;

    if (angular.isUndefined($attrs.pullingIcon)) {
      $attrs.$set('pullingIcon', 'ion-android-arrow-down');
    }
    $scope.showSpinner = angular.isUndefined($attrs.refreshingIcon);

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
      console.log('DRAG END')
      if (!isDragging) return;
      isDragging = false;
      dragOffset = 0;
      if (lastOverscroll > ptrThreshold) {
        self.sharedMethods.start();
        scrollTo(ptrThreshold, scrollTime);
      } else {
        scrollTo(0, scrollTime, self.sharedMethods.deactivate);
        $timeout(function(){
          if (isOverscrolling) {
            isOverscrolling = false;
            setScrollLock(false);
          }
        }, scrollTime);
      }
    }

    function handleDrag(e) {
      console.log(
        self.scrollParent.scrollTop,
        parseInt(e.gesture.deltaY - dragOffset),
        self.scrollChild.style['-webkit-transform'],
        isOverscrolling,
        isDragging,
        activated,
        self.scrollChild.classList.contains('overscroll')
      )
      //document.getElementById('test').innerHTML = self.scrollChild.style['-webkit-transform'];
      if (e.gesture.deltaY - dragOffset < 0 || self.scrollParent.scrollTop != 0) {
        // drag during normal scrolling, keep this light
        // give control to native scrolling
        if (isOverscrolling) {
          isOverscrolling = false;
          setScrollLock(false);
console.log('gets here')
            //self.scrollParent.scrollTop = parseInt(e.gesture.deltaY - dragOffset) * -1;

          //nativescroll(self.scrollParent,100)
          //lastOverscroll = parseInt(e.gesture.deltaY - dragOffset);
        }

        // this only needs to happen once and a DOM read is cheaper than a write
        if (self.scrollChild.style['-webkit-transform'] !== 'translateY(0px)') {
          overscroll(0);
        }
        return;
      }else if (e.gesture.deltaY > 0 && self.scrollParent.scrollTop === 0 && !isOverscrolling) {
        // starting overscroll, but drag started below scrollTop 0, so we need to offset the position
        dragOffset = e.gesture.deltaY;
      }
      if (!isOverscrolling) {
        isOverscrolling = true;
        setScrollLock(true);
      }
      if (lastOverscroll > e.gesture.deltaY - dragOffset) {
        // going backwards
      }else {
        // going forwards
      }
      isDragging = true;
      overscroll(parseInt(e.gesture.deltaY - dragOffset));
      lastOverscroll = parseInt(e.gesture.deltaY - dragOffset);

      if (!activated && lastOverscroll > ptrThreshold) {
        activated = true;
        ionic.requestAnimationFrame(self.sharedMethods.activate);

      } else if (activated && lastOverscroll < ptrThreshold) {
        activated = false;
        ionic.requestAnimationFrame(self.sharedMethods.deactivate);
      }
    }

    function overscroll(val) {
      self.scrollChild.style['-webkit-transform'] = 'translateY(' + val + 'px)';
    }

    function nativescroll(target,newScrollTop) {
      target.scrollTop = newScrollTop;
      var e = document.createEvent("UIEvents");
      // creates a scroll event that bubbles, can be cancelled,
      // and with its view and detail property initialized to window and 1,
      // respectively
      e.initUIEvent("scroll", true, true, window, 1);
      target.dispatchEvent(e);
    }

    function setScrollLock(enabled) {
      if (enabled) {
          self.scrollChild.classList.add('overscroll');
          //self.scrollChild.style.width = "100%";
          //self.scrollChild.style.position = 'fixed';
          self.sharedMethods.show();
      } else {
          self.scrollChild.classList.remove('overscroll');
          //self.scrollChild.style.width = "";
          //self.scrollChild.style.position = '';
          self.sharedMethods.hide();
      }
    }

    $scope.$on('scroll.refreshComplete', function() {
      // prevent the complete from firing before the scroll has started
      $timeout(function() {
        ionic.requestAnimationFrame(self.sharedMethods.tail);
        // scroll back to home during tail animation
        scrollTo(0, scrollTime, self.sharedMethods.deactivate);
        // return to native scrolling after tail animation has time to finish
        $timeout(function() {
          if (isOverscrolling) {
            isOverscrolling = false;
            setScrollLock(false);
          }
        },scrollTime * 2);
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
      function scroll() {
        var currentTime = Date.now(),
          time = min(1, ((currentTime - start) / duration)),
          // where .5 would be 50% of time on a linear scale easedT gives a fraction based on the easing method
          easedT = easing.easeOutCubic(time);
        overscroll(parseInt((easedT * (Y - from)) + from));
        if (time < 1) ionic.requestAnimationFrame(scroll);
        else {
          lastOverscroll = Y;
          if (callback) callback();
        }
      }
      ionic.requestAnimationFrame(scroll);
    }


    self.init = function() {
      self.scrollParent = $element.parent().parent()[0];
      self.scrollChild = $element.parent()[0];
      ionic.onGesture('drag', handleDrag, self.scrollChild);
      ionic.onGesture('dragend', handleDragEnd, self.scrollChild);
    };

    // DOM manipulation and broadcast methods shared by JS and Native Scrolling
    self.sharedMethods = {
      activate: function() {
        $element[0].classList.add('active');
        $scope.$onPulling();
        self.sharedMethods.onPullProgress(1);
      },
      deactivate: function() {
        // give tail 150ms to finish
        $timeout(function() {
          // deactivateCallback
          $element[0].classList.remove('active');
          $element[0].classList.remove('refreshing');
          $element[0].classList.remove('refreshing-tail');
          if (activated) activated = false;
        },150);
      },
      start: function() {
        // startCallback
        $element[0].classList.add('refreshing');
        $scope.$onRefresh();
      },
      show: function() {
        // showCallback
        $element[0].classList.remove('invisible');
      },
      hide: function() {
        // showCallback
        $element[0].classList.add('invisible');
      },
      tail: function() {
        // tailCallback
        $element[0].classList.add('refreshing-tail');
      },
      onPullProgress: function(progress) {
        $scope.$broadcast('$ionicRefresher.pullProgress', progress);
        $scope.$onPullProgress && $scope.$onPullProgress(progress);
      }
    };

    var easing = {
      // no easing, no acceleration
      linear: function (t) { return t },
      // accelerating from zero velocity
      easeInQuad: function (t) { return t*t },
      // decelerating to zero velocity
      easeOutQuad: function (t) { return t*(2-t) },
      // acceleration until halfway, then deceleration
      easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
      // accelerating from zero velocity
      easeInCubic: function (t) { return t*t*t },
      // decelerating to zero velocity
      easeOutCubic: function (t) { return (--t)*t*t+1 },
      // acceleration until halfway, then deceleration
      easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
      // accelerating from zero velocity
      easeInQuart: function (t) { return t*t*t*t },
      // decelerating to zero velocity
      easeOutQuart: function (t) { return 1-(--t)*t*t*t },
      // acceleration until halfway, then deceleration
      easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
      // accelerating from zero velocity
      easeInQuint: function (t) { return t*t*t*t*t },
      // decelerating to zero velocity
      easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
      // acceleration until halfway, then deceleration
      easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
    };
  }
]);
