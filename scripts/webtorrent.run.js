/* global ga releaseTitle releaseVersion stripeKey StripeCheckout downloadRegion */

$(function () {
    var paymentMinimum = 100 // Let's make the minimum $1.00 for now

    var previousButton = 'amount-ten'
    var currentAmount = 'amount-ten'

    var amountHandler = function (e) {
        var targetId = $(e.target).attr('id') // avoids null values vs native js
        var targetType = e.type

        // Verify the number
        if (!$(e.target).hasClass('target-amount') && currentAmount === 'amount-custom') {
            var i = document.getElementById('amount-custom')

            // all the things for a 'bad input'
            if (!i.validity.valid || i.value === '') {
                targetId = previousButton
                targetType = 'click'
            }
        }

        // on button / input becoming active. Focus of custom amount with valid input considered becoming active
        if ((targetId === 'amount-custom' || targetType !== 'focusin') && $('#' + targetId).hasClass('target-amount')) {
            if (targetId !== 'amount-custom') previousButton = targetId

            $('.target-amount').removeClass('checked')
            $('#' + targetId).addClass('checked')
            currentAmount = targetId

            updateDownloadButton()
        }
    }

    // Capture all inputs so we can dictate what download amount is in use
    $(document).on('click focusin', amountHandler)

    var amountValidate = function (event) {
        var currentVal = $('#amount-custom').val()
        var code = event.which || event.keyCode || event.charCode

        if ((code !== 46 || currentVal.indexOf('.') !== -1) &&
        [8, 37, 39].indexOf(code) === -1 &&
        (code < 48 || code > 57)) {
            event.preventDefault()
        }
    }

    // Don't allow non-digit input
    $('#amount-custom').keypress(amountValidate)

    $('#download').click(function () {
        var paymentAmount = $('#' + currentAmount).val() * 100

        console.log('Pay ' + currentAmount)
        console.log('Starting payment for ' + paymentAmount)

        if (paymentAmount < paymentMinimum) {
            if (window.ga) {
                ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Download (Free)', 'Homepage', paymentAmount)
            }

            openDownloadOverlay()
        } else {
            if (window.ga) {
                ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Payment (Initiated)', 'Homepage', paymentAmount)
            }

            doStripePayment(paymentAmount)
        }
    })

    function stripeLanguage () {
        var stripeLanguages = ['de', 'en', 'es', 'fr', 'it', 'jp', 'nl', 'zh']
        var languageCode = $('html').prop('lang')

        // Stripe supports simplified chinese
        if (/^zh_CN/.test(languageCode)) {
            return 'zh'
        }

        if (stripeLanguages.indexOf(languageCode) !== -1) {
            return languageCode
        }
    }

    function detectOS () {
        var ua = window.navigator.userAgent

        if (ua.indexOf('Android') >= 0) {
            return 'Android'
        }

        if (ua.indexOf('Mac OS X') >= 0 && ua.indexOf('Mobile') >= 0) {
            return 'iOS'
        }

        if (ua.indexOf('Windows') >= 0) {
            return 'Windows'
        }

        if (ua.indexOf('Mac_PowerPC') >= 0 || ua.indexOf('Macintosh') >= 0) {
            return 'OS X'
        }

        if (ua.indexOf('Linux') >= 0) {
            return 'Linux'
        }

        return 'Other'
    }
    var detectedOS = detectOS()

    function doStripePayment (amount) {
        StripeCheckout.open({
            key: stripeKey,
            token: function (token) {
                console.log(JSON.parse(JSON.stringify(token)))

                processPayment(amount, token)
                openDownloadOverlay()
            },
            name: 'elementary LLC.',
            description: releaseTitle + ' ' + releaseVersion,
            bitcoin: true,
            alipay: 'auto',
            locale: stripeLanguage() || 'auto',
            amount: amount
        })
    }

    function processPayment (amount, token) {
        var $amountTen = $('#amount-ten')

        if (window.ga) {
            ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Payment (Actual)', 'Homepage', amount)
        }

        if ($amountTen.val() !== 0) {
            $('#amounts').html('<input type="hidden" id="amount-ten" value="0">')
            updateDownloadButton()
        }

        var paymentHttp = new XMLHttpRequest()
        paymentHttp.open('POST', './backend/payment.php', true)
        paymentHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded')
        paymentHttp.send('description=' + encodeURIComponent(releaseTitle + ' ' + releaseVersion) +
                     '&amount=' + amount +
                     '&token=' + token.id +
                     '&email=' + encodeURIComponent(token.email) +
                     '&os=' + detectedOS
        )
    }

    function openDownloadOverlay () {
        var $openModal = $('.open-modal')

        console.log('Open the download overlay!')

        $openModal.leanModal({
            top: '15vmin',
            overlayOpacity: 0.5,
            closeButton: '.close-modal'
        })

        $openModal.click()
    }

    if (window.ga) {
        var downloadLinks = $('#download-modal').find('.actions').find('a')

        var linksData = [
        { arch: '32-bit', method: 'HTTP' },
        { arch: '32-bit', method: 'Magnet' },
        { arch: '64-bit', method: 'HTTP' },
        { arch: '64-bit', method: 'Magnet' }
        ]

        for (var i = 0; i < linksData.length; i++) {
            (function (data, link) {
                $(link).click(function () {
                    ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Download (Architecture)', 'Homepage', data.arch)
                    ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Download (Method)', 'Homepage', data.method)
                    ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Download (OS)', 'Homepage', detectedOS)
                    ga('send', 'event', releaseTitle + ' ' + releaseVersion + ' Download (Region)', 'Homepage', downloadRegion)
                })
            })(linksData[i], downloadLinks[i])
        }
    }

    // Change Button text on payment click
    function updateDownloadButton () {
        var translateDownload = $('#translate-download').text()
        var translatePurchase = $('#translate-purchase').text()

        if ($('#amounts').children().length <= 1) {
            $('#download').text(translateDownload)
            document.title = translateDownload
        } else if (
      $('button.payment-button').hasClass('checked') ||
      $('#amount-custom').val() * 100 >= paymentMinimum
    ) {
            $('#download').text(translatePurchase)
            document.title = translatePurchase
        } else {
            $('#download').text(translateDownload)
            document.title = translateDownload
        }
    }

    $('#amounts').on('click', updateDownloadButton)
    $('#amounts input').on('input', updateDownloadButton)
    updateDownloadButton()

    console.log('Loaded homepage.js')
})