import { Component } from '@angular/core';
import { JdEvaluation } from './jd-evaluation';

/** A host only: all evaluator functionality comes from the portable component. */
@Component({
  selector: 'app-jd-sandbox',
  imports: [JdEvaluation],
  templateUrl: './jd-sandbox.html',
  styleUrl: './jd-sandbox.scss',
})
export class JdSandbox {}
