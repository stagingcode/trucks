var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
var expect = chai.expect;

describe('App', function() {
    describe('Index', function () {
        browser.get('/');

        it('should contain link to itself', function() {
            expect(element.all(by.css('h3')).first().getText())
                .to.eventually.equal('Home');
        });
    });
});