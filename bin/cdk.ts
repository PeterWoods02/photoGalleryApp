#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PhotoGalleryAppStack } from '../lib/photo_gallery_app';

const app = new cdk.App();
new PhotoGalleryAppStack(app, 'PhotoGalleryAppStack', {
 });