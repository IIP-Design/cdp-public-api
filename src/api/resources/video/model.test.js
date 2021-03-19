import { expect } from 'chai';
import VideoModel from './model';

const model = new VideoModel();

// eslint-disable-next-line no-unused-vars
const con = obj => {
  console.log( JSON.stringify( obj, null, 2 ) );
};

describe.only( 'Models', () => {
  describe( 'video', () => {
    describe( 'validateSchema(json)', () => {
      it( 'should throw error if missing site', () => {
        const json = {
          post_id: 1,
        };
        const result = VideoModel.validateSchema( json );

        expect( result.valid ).to.be.false;
      } );

      it( 'should throw error if missing post_id', () => {
        const json = {
          site: 'america.gov',
        };
        const result = VideoModel.validateSchema( json );

        expect( result.valid ).to.be.false;
      } );

      it( 'should remove unspecified properties and keep specified', () => {
        const json = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          deleteMe: 'I should not exist.',
          meToo: 'me too.',
          unit: [],
          title: 'wrong level',
          meNeigh: 'should not exist',
          source: 'wrong level',
          published: '2017-12-18T10:53:49+00:00', // string
          modified: '2018-01-03T13:38:57+00:00', // string
          owner: 'Scott Gustas', // string
          author: 'Scott Gustas', // string
          duration: 60, // number
        };
        const check = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          published: '2017-12-18T10:53:49+00:00',
          modified: '2018-01-03T13:38:57+00:00',
          owner: 'Scott Gustas',
          author: 'Scott Gustas',
          duration: 60,
          unit: [],
        };
        const result = VideoModel.validateSchema( json );

        expect( result.valid ).to.be.true;
        expect( json ).to.deep.equals( check );
      } );

      it( 'should convert properties to arrays if not and expected as such', () => {
        const json = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: '',
          source: 'stuff in here but will be removed',
        };
        const check = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [],
        };
        const result = VideoModel.validateSchema( json );

        expect( result.valid ).to.be.true;
        expect( json ).to.deep.equals( check );
      } );

      it( 'should keep everything in the categories and tags arrays', () => {
        const json = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              categories: [
                'cat', 'cat2', 'cat3',
              ],
              tags: ['tag1', 'tag2'],
              source: [],
            },
            {
              categories: [
                'cat', 'cat1', 'cat3', 'cat4',
              ],
              tags: ['tag1', 'tag2'],
              source: [],
            },
          ],
        };
        const check = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              categories: [
                'cat', 'cat2', 'cat3',
              ],
              tags: ['tag1', 'tag2'],
              source: [],
            },
            {
              categories: [
                'cat', 'cat1', 'cat3', 'cat4',
              ],
              tags: ['tag1', 'tag2'],
              source: [],
            },
          ],
        };

        con( json );
        const result = VideoModel.validateSchema( json );

        con( json );
        expect( result.valid ).to.be.true;
        expect( json ).to.deep.equals( check );
      } );

      it( 'should add source to units if missing', () => {
        const json = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              title: 'English Title 1',
            },
            {
              title: 'English Title 2',
            },
          ],
        };
        const check = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              title: 'English Title 1',
              source: [],
            },
            {
              title: 'English Title 2',
              source: [],
            },
          ],
        };

        con( json );
        const result = VideoModel.validateSchema( json );

        con( json );
        expect( result.valid ).to.be.true;
        expect( json ).to.deep.equals( check );
      } );

      it( 'should iterate over and validate each item in the unit array', () => {
        const json = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              language: {
                language_code: 'en',
                locale: 'en-US',
                text_direction: false,
                display_name: 'English',
                native_name: 'English',
                different_language: true,
              },
              title: 'English Title 1',
              desc: 'English Desc 1',
              transcript: {
                removeme: 'I should not be here',
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2016/06/P_010313_Planning_for_Success_English_LR.pdf',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
                text: 'transcript goes here',
              },
              srt: {
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/YALI_hero_wash_2x1-1.srt',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
                deleteme: 'I should not be here',
              },
              removeme: 'I should not be here',
              categories: ['cat'],
              tags: ['tag1', 'tag2'],
              source: 'i should be an array',
            },
            {
              language: {
                language_code: 'en',
                locale: 'en-US',
                text_direction: false,
                display_name: 'English',
                native_name: 'English',
                different_language: true,
              },
              title: 'English Title 2',
              desc: 'English Desc 2',
              transcript: {
                removeme: 'I should not be here',
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2016/06/P_010313_Planning_for_Success_English_LR.pdf',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
                text: 'transcript goes here',
              },
              srt: {
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/YALI_hero_wash_2x1-1.srt',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
                deleteme: 'I should not be here',
              },
              removemetoo: 'I should not be here either',
              categories: ['cat'],
              tags: ['tag1', 'tag2'],
              source: [],
            },
          ],
        };
        const check = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              language: {
                language_code: 'en',
                locale: 'en-US',
                text_direction: false,
                display_name: 'English',
                native_name: 'English',
                different_language: true,
              },
              title: 'English Title 1',
              desc: 'English Desc 1',
              transcript: {
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2016/06/P_010313_Planning_for_Success_English_LR.pdf',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
                text: 'transcript goes here',
              },
              srt: {
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/YALI_hero_wash_2x1-1.srt',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
              },
              categories: ['cat'],
              tags: ['tag1', 'tag2'],
              source: [],
            },
            {
              language: {
                language_code: 'en',
                locale: 'en-US',
                text_direction: false,
                display_name: 'English',
                native_name: 'English',
                different_language: true,
              },
              title: 'English Title 2',
              desc: 'English Desc 2',
              transcript: {
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2016/06/P_010313_Planning_for_Success_English_LR.pdf',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
                text: 'transcript goes here',
              },
              srt: {
                srcUrl:
                  'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/YALI_hero_wash_2x1-1.srt',
                md5: '1a79a4d60de6718e8e5b326e338ae533',
              },
              categories: ['cat'],
              tags: ['tag1', 'tag2'],
              source: [],
            },
          ],
        };
        const result = VideoModel.validateSchema( json );

        expect( result.valid ).to.be.true;
        expect( json ).to.deep.equals( check );
      } );

      it( 'should iterate over and validate each item in the source array of unit objects', () => {
        const json = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              title: 'English Title 1',
              source: [
                {
                  burnedInCaptions: 'no',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  removeme: 'I should not be here',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    deleteme: 'I should not be here brah',
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                  },
                },
                {
                  burnedInCaptions: 'yes',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    deleteme: 'I should not be here brah',
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                    asdfasdf: 'I should not be here',
                  },
                },
              ],
            },
            {
              title: 'English Title 2',
              source: [
                {
                  burnedInCaptions: 'no',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  removeme: 'I should not be here',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    deleteme: 'I should not be here brah',
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                  },
                },
                {
                  burnedInCaptions: 'yes',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    deleteme: 'I should not be here brah',
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                    asdfasdf: 'I should not be here',
                  },
                },
              ],
            },
          ],
        };
        const check = {
          site: 'america.gov',
          post_id: 1,
          type: 'video',
          unit: [
            {
              title: 'English Title 1',
              source: [
                {
                  burnedInCaptions: 'no',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                  },
                },
                {
                  burnedInCaptions: 'yes',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                  },
                },
              ],
            },
            {
              title: 'English Title 2',
              source: [
                {
                  burnedInCaptions: 'no',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                  },
                },
                {
                  burnedInCaptions: 'yes',
                  downloadUrl:
                    'http://ylai.edit.america.dev/wp-content/uploads/sites/2/2017/12/COE_s-dWsAAJp3S.mp4',
                  md5: '1a79a4d60de6718e8e5b326e338ae533',
                  streamUrl: 'http://www.youtube.com/testvideo',
                  filetype: 'mp4',
                  size: {
                    width: 640,
                    height: 360,
                    filesize: 173929,
                    bitrate: 4727234.123412,
                  },
                },
              ],
            },
          ],
        };
        const result = VideoModel.validateSchema( json );

        expect( result.valid ).to.be.true;
        expect( json ).to.deep.equals( check );
      } );
    } );
  } );
} );
