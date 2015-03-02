var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
var expect = chai.expect;

describe('Monkey', function() {
    it('should jump', function() {
        expect(1 + 2).to.equal(3);
    });
});