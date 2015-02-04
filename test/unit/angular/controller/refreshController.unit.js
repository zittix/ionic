describe('$ionicRefresh Controller', function() {

  beforeEach(module('ionic'));
  beforeEach(inject(function($ionicConfig) {
    ionic.Platform.ready = function(cb) { cb(); };
    ionic.requestAnimationFrame = function(cb) { cb(); };
    $ionicConfig.scrolling.jsScrolling(false);
  }));

  function setup(options) {
    options = options || {};
    options.el = options.el ||
      angular.element('<ion-refresher></ion-refresher><div class="list"></div>')[0];
    scrollEl = options.parent ||
      angular.element('<div class="ionic-scroll"><div class="scroll"></div></div>');
    scrollEl.find('.scroll').append(options.el);

    inject(function($controller, $rootScope, $timeout, $compile) {
      scope = $rootScope.$new();

      $compile(scrollEl)(scope);
      scope.$apply();
      scope.$onRefresh = jasmine.createSpy('onRefresh');
      scope.$onPulling = jasmine.createSpy('onPulling');
      refresher = scrollEl.find('.scroll-refresher')[0]
      ctrl = angular.element(refresher).controller('ionRefresher');
      timeout = $timeout;
    });
  }
  function evt(y) {
    return {
      touches: [
        {screenY:y}
      ],
      preventDefault: function() {}
    };
  }

  it('should error if not child of scroll view', function() {
    setup({parent: angular.element('<div></div>')});
    expect(ctrl).toBe(undefined);
  });

  it('should oversroll using CSS transforms', function() {
    setup();
    spyOn(ctrl.sharedMethods, 'show');

    ctrl.__drag(evt(0));
    ctrl.__drag(evt(10));
    ctrl.__drag(evt(20));
    expect(ctrl.scrollChild.style.transform).toBe('translateY(10px)');
    expect(ctrl.scrollChild.classList.contains('overscroll')).toBe(true);
    expect(ctrl.sharedMethods.show).toHaveBeenCalled();
  });

  it('should resume native scrolling when overscroll is done', function() {
    setup();
    spyOn(ctrl.sharedMethods, 'show');
    spyOn(ctrl.sharedMethods, 'hide');

    ctrl.__drag(evt(0));
    ctrl.__drag(evt(10));
    ctrl.__drag(evt(0));
    expect(ctrl.scrollChild.style.transform).toBe('translateY(0px)');
    expect(ctrl.scrollChild.classList.contains('overscroll')).toBe(false);
    expect(ctrl.sharedMethods.show).toHaveBeenCalled();
    expect(ctrl.sharedMethods.hide).toHaveBeenCalled();
  });

  it('should activate and deactivate when dragging past activation threshold', function() {
    setup();
    spyOn(ctrl.sharedMethods, 'activate');
    spyOn(ctrl.sharedMethods, 'deactivate');

    ctrl.__drag(evt(0));
    ctrl.__drag(evt(10));
    ctrl.__drag(evt(100));
    expect(ctrl.scrollChild.style.transform).toBe('translateY(90px)');
    expect(ctrl.scrollChild.classList.contains('overscroll')).toBe(true);
    expect(ctrl.sharedMethods.activate).toHaveBeenCalled();
    expect(ctrl.sharedMethods.deactivate).not.toHaveBeenCalled();

    ctrl.__drag(evt(0));
    timeout.flush()
    expect(ctrl.scrollChild.style.transform).toBe('translateY(0px)');
    expect(ctrl.scrollChild.classList.contains('overscroll')).toBe(false);
    //expect(ctrl.sharedMethods.deactivate).toHaveBeenCalled();
  });

  it('should update refresher class when shared methods fire', function() {
    setup();

    scope.$onRefresh = jasmine.createSpy('onRefresh');
    scope.$onPulling = jasmine.createSpy('onPulling');

    spyOn(ctrl.sharedMethods, 'onPullProgress');

    expect(refresher.classList.contains('active')).toBe(false);
    expect(refresher.classList.contains('refreshing')).toBe(false);
    expect(refresher.classList.contains('invisible')).toBe(true);
    expect(ctrl.sharedMethods.onPullProgress).not.toHaveBeenCalled();
    expect(scope.$onRefresh).not.toHaveBeenCalled();
    expect(scope.$onPulling).not.toHaveBeenCalled();

    ctrl.sharedMethods.show();
    expect(refresher.classList.contains('invisible')).toBe(false);

    ctrl.sharedMethods.activate();
    expect(refresher.classList.contains('active')).toBe(true);
    expect(refresher.classList.contains('refreshing')).toBe(false);
    expect(scope.$onPulling).toHaveBeenCalled();
    expect(ctrl.sharedMethods.onPullProgress).toHaveBeenCalledWith(1);

    ctrl.sharedMethods.start();
    expect(refresher.classList.contains('refreshing')).toBe(true);
    expect(scope.$onRefresh).toHaveBeenCalled();

    ctrl.sharedMethods.tail();
    expect(refresher.classList.contains('refreshing-tail')).toBe(true);

    ctrl.sharedMethods.deactivate();
    timeout.flush();
    expect(refresher.classList.contains('active')).toBe(false);
    expect(refresher.classList.contains('refreshing')).toBe(false);
    expect(refresher.classList.contains('refreshing-tail')).toBe(false);

    ctrl.sharedMethods.hide();
    expect(refresher.classList.contains('invisible')).toBe(true);
  });
});
