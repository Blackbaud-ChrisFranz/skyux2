(function () {
  'use strict';

  var fs = require('fs');
  var path = require('path');
  var util = require('util');

  function checkAccessibility(browser, options) {
    console.log('checkAccessibility()', options.screenshotName);
    return browser
      .executeAsync(function (done) {

        var config = {
          rules: {
            'bypass': { enabled: false },
            'color-contrast': { enabled: false }
          }
        };

        axe.a11yCheck(document, config, function (results) {
          done(results);
        });

      })
      .then(function (ret) {
        if (ret.value.violations && ret.value.violations.length !== 0) {
          console.log('Accessibility checks complete.', options.screenshotName);
          logViolations(options.screenshotName, ret.value.violations);
          expect(ret.value.violations.length).toBe(0, ' number of accessiblity violations');
        }

        return;
      });
  }

  function checkVisualResult(results, options, browser) {
    console.log('checkVisualResult()', options.screenshotName, results.length);
    results.forEach(function (element) {
      if (!element.isWithinMisMatchTolerance) {
        log('Screenshot has mismatch percentage of ' + element.misMatchPercentage);
      }

      expect(element.isWithinMisMatchTolerance).toBe(true);
    });

    if (options.checkAccessibility) {
      return checkAccessibility(browser, options);
    } else {
      return;
    }
  }

  function getViewSizeHandler(width, browser, options) {
    var widthString = '.' + width + 'px';

    options.screenshotName =
      options.screenshotName + '_full' + '.' + options.screenshotName + widthString;

    console.log('getViewSizehandler()', options.screenshotName);

    return browser
      .checkElement(options.selector)
      .then(function (results) {
        console.log('Element checked!', options.screenshotName);
        return checkVisualResult(results, options, this);
      })
      .catch(function (err) {
        log('checkElement() ERROR!', err);
        throw err;
      });
  }

  function compareScreenshot(browser, options) {
    console.log('Comparing screenshot for', options.screenshotName);
    return browser
      .getViewportSize('width')
      .then(function (width) {
        return getViewSizeHandler(width, this, options);
      });
  }

  function getPrefix(desiredCapabilities) {
    return desiredCapabilities.os + '_' + desiredCapabilities.browserName;
  }

  function log(message) {
    console.log('\x1b[31m', message);
  }

  function logViolations(name, violations) {
    log(util.format(
      '\nThe following accessibility issues exist in %s:\n',
      name
    ));

    violations.forEach(function (violation)  {
      log(' violation at: ' + violation.help);
      violation.nodes.forEach(function (line) {
        log(line.target);
      });

      log('More Information: ' + violation.helpUrl);
    });
  }

  function focusElement(browser, selector) {
    return browser.execute('document.querySelector("' + selector + '").focus()');
  }

  function moveCursorOffScreen(browser) {
    return browser.moveToObject('body', 0, 0);
  }

  function setupTest(browser, url, screenWidth) {
    console.log('Setting up test for ', url, '...');
    return browser
      .url(url)
      .getViewportSize()
      .then(function (size) {
        if (size.width !== screenWidth) {
          return browser.setViewportSize({
            height: size.height,
            width: screenWidth
          });
        } else {
          return;
        }
      });
  }

  function getScreenshotName(basePath) {
    return function (context) {
      var prefix = getPrefix(context.desiredCapabilities);
      var screenshotName = context.options.screenshotName;

      screenshotName = prefix + '_' + screenshotName + '.baseline.png';

      return path.join(basePath, prefix, screenshotName);
    };
  }

  function getVisualRegression(referenceFolder, screenshotFolder, diffsFolder) {
    var VisualRegressionCompare = require('wdio-visual-regression-service/compare');
    return {
      compare: new VisualRegressionCompare.LocalCompare({
        referenceName: getScreenshotName(path.join(process.cwd(), referenceFolder)),
        screenshotName: getScreenshotName(path.join(process.cwd(), screenshotFolder)),
        diffName: getScreenshotName(path.join(process.cwd(), diffsFolder)),
        misMatchTolerance: 1.5
      }),
      viewportChangePause: 300
    };
  }

  module.exports = {
    compareScreenshot: compareScreenshot,
    focusElement: focusElement,
    moveCursorOffScreen: moveCursorOffScreen,
    setupTest: setupTest,
    getVisualRegression: getVisualRegression
  };

})();
