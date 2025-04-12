#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PhotoGalleryAppStack } from '../lib/photoGalleryStack';

const app = new cdk.App();
new PhotoGalleryAppStack(app, 'PhotoGalleryAppStack', {
 });