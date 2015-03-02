
$(function () {
    'use strict';
    /* global $: true */

    function readCookie(cookieName) {
        var re = new RegExp('[; ]'+cookieName+'=([^\\s;]*)');
        var sMatch = (' '+document.cookie).match(re);
        if (cookieName && sMatch) {
            return decodeURIComponent(sMatch[1]);
        }
        return '';
    }

    $('.ajax-form').on('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();

        var self = $(this);
        self.find('.form-success').hide();
        self.find('.form-error').hide();
        self.find('button').attr('disabled', 'disabled');
        self.find('.form-group').removeClass('has-error');

        if (self.data('role') === 'set-password') {
            var psw1 = self.find('input[name="password"]').val();
            var psw2 = self.find('input[name="password2"]').val();
            if (psw1 !== psw2) {
                self.find('.form-error').text('Passwords do not match');
                self.find('.form-error').show();
                self.find('button').attr('disabled', false);
                self.find('.form-group').addClass('has-error');
                return;
            }
        }
        
        var opts = {
            url: self.attr('action'),
            method: self.attr('method'),
            data: self.serialize(),
            headers: {
                'X-XSRF-TOKEN': readCookie('XSRF-TOKEN')
            }
        };
        opts.error = function (resp) {
            if(resp.status >= 400) {
                self.find('.form-error').text(resp.responseJSON.error.msg);
                self.find('.form-error').show();
                self.find('button').attr('disabled', false);
                self.find('.form-group').addClass('has-error');
            }
        };
        
        switch (self.data('role')) {
            case 'recover':
                opts.success = function () {
                    self.find('.form-success .email').text(self.find('input[name="email"]').val());
                    self.find('.form-success').show();
                    self.find('button').attr('disabled', false);
                };
                break;
            default:
                opts.success = function () {
                    window.location.href = '/app/dashboard';
                };
                break;
        }

        $.ajax(opts);
    });
});